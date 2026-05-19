// One-shot seed: creates test accounts for Apple reviewer / Ryan's delete testing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* no body */ }

  const email = body.email || "appreview@praetoriagroup.ca";
  const password = body.password || "Praetoria2026!";
  const fullName = body.full_name || "Apple Reviewer";
  const role = body.role || "lead_worker";

  let userId: string | undefined;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  userId = created?.user?.id;

  if (createErr && !userId) {
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === email);
    if (!existing) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 500 });
    }
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  }

  await admin.from("user_roles").upsert(
    { user_id: userId!, role },
    { onConflict: "user_id,role" }
  );

  return new Response(
    JSON.stringify({ success: true, email, password, user_id: userId, role }),
    { headers: { "content-type": "application/json" } }
  );
});
