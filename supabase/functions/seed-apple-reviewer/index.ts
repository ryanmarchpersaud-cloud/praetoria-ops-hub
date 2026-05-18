// One-shot: create a second worker account for Apple's reviewer to delete.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const email = "appreview2.worker@praetoriagroup.ca";
  const password = "AppleReview2026!";

  // Create (or fetch) the auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Apple Reviewer 2" },
  });

  let userId = created?.user?.id;
  if (createErr && !userId) {
    // Already exists — look it up and reset password
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === email);
    if (!existing) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 500 });
    }
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
  }

  // Assign lead_worker role (idempotent)
  await admin.from("user_roles").upsert(
    { user_id: userId!, role: "lead_worker" },
    { onConflict: "user_id,role" }
  );

  return new Response(
    JSON.stringify({ success: true, email, password, user_id: userId }),
    { headers: { "content-type": "application/json" } }
  );
});
