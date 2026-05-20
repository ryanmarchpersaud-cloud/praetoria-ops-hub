// Seeds three Apple-reviewer test accounts (one per portal) so the
// reviewer can verify the Delete Account flow from Worker, Subcontractor
// and Customer portals. Idempotent.
//
// Accounts:
//   - appreview.worker@praetoriagroup.ca       (lead_worker)
//   - appreview.sub@praetoriagroup.ca          (subcontractor)
//   - appreview.customer@praetoriagroup.ca     (customer)
// Password (all three): Praetoria2026!
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PASSWORD = "Praetoria2026!";

const ACCOUNTS = [
  { email: "appreview.worker@praetoriagroup.ca",   role: "lead_worker",   full_name: "Apple Reviewer (Worker)" },
  { email: "appreview.sub@praetoriagroup.ca",      role: "subcontractor", full_name: "Apple Reviewer (Subcontractor)" },
  { email: "appreview.customer@praetoriagroup.ca", role: "customer",      full_name: "Apple Reviewer (Customer)" },
];

Deno.serve(async (_req) => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const results: any[] = [];

  for (const acct of ACCOUNTS) {
    let userId: string | undefined;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: acct.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: acct.full_name },
    });
    userId = created?.user?.id;

    if (createErr && !userId) {
      // Already exists — find and reset password.
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users?.find((u) => u.email === acct.email);
      if (!existing) {
        results.push({ email: acct.email, ok: false, error: createErr.message });
        continue;
      }
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        password: PASSWORD,
        email_confirm: true,
      });
    }

    // Assign primary role
    await admin
      .from("user_roles")
      .upsert({ user_id: userId!, role: acct.role }, { onConflict: "user_id,role" });

    // Make sure there's a customer record for the customer reviewer so the
    // portal can load their profile.
    if (acct.role === "customer") {
      const { data: existingCust } = await admin
        .from("customers")
        .select("id")
        .eq("user_id", userId!)
        .maybeSingle();
      if (!existingCust) {
        await admin.from("customers").insert({
          user_id: userId!,
          first_name: "Apple",
          last_name: "Reviewer",
          email: acct.email,
          customer_status: "Active",
        });
      }
    }

    // Make sure there's a worker_profiles row for the worker reviewer.
    if (acct.role === "lead_worker") {
      const { data: existingWp } = await admin
        .from("worker_profiles")
        .select("id")
        .eq("user_id", userId!)
        .maybeSingle();
      if (!existingWp) {
        await admin.from("worker_profiles").insert({
          user_id: userId!,
          full_name: acct.full_name,
          role_title: "Lead Worker",
        });
      }
    }

    // Make sure there's a subcontractors row for the sub reviewer.
    if (acct.role === "subcontractor") {
      const { data: existingSub } = await admin
        .from("subcontractors")
        .select("id")
        .eq("user_id", userId!)
        .maybeSingle();
      if (!existingSub) {
        await admin.from("subcontractors").insert({
          user_id: userId!,
          company_name: "Apple Reviewer Test Co.",
          contact_name: acct.full_name,
          email: acct.email,
          status: "Active",
        });
      }
    }

    results.push({ email: acct.email, ok: true, user_id: userId, role: acct.role });
  }

  return new Response(
    JSON.stringify({ success: true, password: PASSWORD, accounts: results }, null, 2),
    { headers: { "content-type": "application/json" } },
  );
});
