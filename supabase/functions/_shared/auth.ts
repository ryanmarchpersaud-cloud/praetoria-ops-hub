// Shared authentication helpers for Lovable Cloud edge functions.
// Standardizes JWT validation and role gating so future functions don't drift.
//
// Usage:
//   import { requireAuth, requireRole } from "../_shared/auth.ts";
//   const auth = await requireAuth(req);
//   if (!auth.ok) return auth.response;
//   const gate = await requireRole(auth, ["admin", "owner"]);
//   if (!gate.ok) return gate.response;
//   // auth.userId / auth.email / auth.adminClient are now safe to use.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResp = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export type AuthSuccess = {
  ok: true;
  userId: string;
  email: string | null;
  token: string;
  adminClient: SupabaseClient;
};
export type AuthFailure = { ok: false; response: Response };
export type AuthResult = AuthSuccess | AuthFailure;

export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: jsonResp({ error: "Unauthorized" }, 401) };
  }
  const token = authHeader.replace("Bearer ", "");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { ok: false, response: jsonResp({ error: "Server misconfigured" }, 500) };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return { ok: false, response: jsonResp({ error: "Unauthorized" }, 401) };
  }

  const adminClient = createClient(supabaseUrl, serviceKey);
  return {
    ok: true,
    userId: data.claims.sub as string,
    email: (data.claims.email as string) ?? null,
    token,
    adminClient,
  };
}

export async function requireRole(
  auth: AuthSuccess,
  allowedRoles: string[]
): Promise<{ ok: true } | AuthFailure> {
  const { data, error } = await auth.adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.userId);
  if (error) {
    return { ok: false, response: jsonResp({ error: "Role lookup failed" }, 500) };
  }
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  const allowed = roles.some((r) => allowedRoles.includes(r));
  if (!allowed) {
    return { ok: false, response: jsonResp({ error: "Forbidden" }, 403) };
  }
  return { ok: true };
}
