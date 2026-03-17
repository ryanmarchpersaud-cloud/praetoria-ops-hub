import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const testAccounts = [
      { email: "admin@praetoriagroup.ca", password: "TestAdmin123!", role: "admin" as const, displayName: "Admin User" },
      { email: "worker@praetoriagroup.ca", password: "TestWorker123!", role: "staff" as const, displayName: "Field Worker" },
      { email: "customer@praetoriagroup.ca", password: "TestCustomer123!", role: "customer" as const, displayName: "Demo Customer" },
      { email: "subcontractor@praetoriagroup.ca", password: "TestSub123!", role: "subcontractor" as const, displayName: "Daniel Ross" },
    ];

    const results = [];

    for (const account of testAccounts) {
      // Check if user already exists by trying to sign in
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === account.email);

      let userId: string;

      if (existing) {
        userId = existing.id;
        results.push({ email: account.email, status: "already_exists", role: account.role });
      } else {
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: { full_name: account.displayName },
        });
        if (createErr) {
          results.push({ email: account.email, status: "error", error: createErr.message });
          continue;
        }
        userId = newUser.user.id;
        results.push({ email: account.email, status: "created", role: account.role });
      }

      // Ensure role exists
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", account.role)
        .maybeSingle();

      if (!existingRole) {
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: account.role });
      }

      // For customer role, ensure a customer record exists
      if (account.role === "customer") {
        const { data: existingCustomer } = await supabaseAdmin
          .from("customers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingCustomer) {
          await supabaseAdmin.from("customers").insert({
            user_id: userId,
            first_name: "Demo",
            last_name: "Customer",
            email: account.email,
            phone: "604-555-0100",
            address_line_1: "123 Test Avenue",
            city: "Vancouver",
            province: "BC",
            postal_code: "V6B 1A1",
          });
        }
      }

      // For subcontractor role, ensure a subcontractor record exists
      if (account.role === "subcontractor") {
        const { data: existingSub } = await supabaseAdmin
          .from("subcontractors")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingSub) {
          await supabaseAdmin.from("subcontractors").insert({
            user_id: userId,
            company_name: "Prairie Seasonal Services Ltd.",
            operating_name: "Prairie Seasonal",
            contact_name: "Daniel Ross",
            email: account.email,
            phone: "306-555-0118",
            service_area_summary: "Regina, SK",
            status: "active",
            onboarding_status: "approved",
            active_flag: true,
            insurance_status: "active",
            insurance_expiry: "2027-03-01",
            wcb_status: "active",
            wcb_expiry: "2027-06-01",
            business_license_status: "pending",
            agreement_signed_status: "signed",
            safety_doc_status: "active",
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
