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
      { email: "worker@praetoriagroup.ca", password: "TestWorker123!", role: "staff" as const, displayName: "Marcus Thompson" },
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

      // For subcontractor, seed demo invoices and service categories
      if (account.role === "subcontractor") {
        const { data: subRecord } = await supabaseAdmin
          .from("subcontractors")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (subRecord) {
          // Seed service categories
          const categories = ["snow_ice", "landscaping"];
          for (const cat of categories) {
            const { data: existingCat } = await supabaseAdmin
              .from("subcontractor_service_categories")
              .select("id")
              .eq("subcontractor_id", subRecord.id)
              .eq("service_category", cat)
              .maybeSingle();
            if (!existingCat) {
              await supabaseAdmin.from("subcontractor_service_categories").insert({
                subcontractor_id: subRecord.id,
                service_category: cat,
              });
            }
          }

          // Seed demo invoices
          const demoInvoices = [
            { invoice_number: "INV-SUB-0001", amount: 1250, status: "submitted", invoice_date: "2026-03-10", service_period_start: "2026-03-01", service_period_end: "2026-03-07" },
            { invoice_number: "INV-SUB-0002", amount: 2100, status: "approved", invoice_date: "2026-02-28", service_period_start: "2026-02-15", service_period_end: "2026-02-28", approved_at: "2026-03-05T12:00:00Z" },
            { invoice_number: "INV-SUB-0003", amount: 875, status: "paid", invoice_date: "2026-02-14", service_period_start: "2026-02-01", service_period_end: "2026-02-14", approved_at: "2026-02-20T12:00:00Z", paid_at: "2026-02-25T12:00:00Z" },
          ];
          for (const inv of demoInvoices) {
            const { data: existingInv } = await supabaseAdmin
              .from("subcontractor_invoices")
              .select("id")
              .eq("subcontractor_id", subRecord.id)
              .eq("invoice_number", inv.invoice_number)
              .maybeSingle();
            if (!existingInv) {
              await supabaseAdmin.from("subcontractor_invoices").insert({
                subcontractor_id: subRecord.id,
                ...inv,
              });
            }
          }

          // Seed a demo payment for the paid invoice
          const { data: paidInv } = await supabaseAdmin
            .from("subcontractor_invoices")
            .select("id")
            .eq("subcontractor_id", subRecord.id)
            .eq("invoice_number", "INV-SUB-0003")
            .maybeSingle();
          if (paidInv) {
            const { data: existingPmt } = await supabaseAdmin
              .from("subcontractor_payments")
              .select("id")
              .eq("invoice_id", paidInv.id)
              .maybeSingle();
            if (!existingPmt) {
              await supabaseAdmin.from("subcontractor_payments").insert({
                subcontractor_id: subRecord.id,
                invoice_id: paidInv.id,
                amount: 875,
                payment_date: "2026-02-25",
                payment_method: "e-transfer",
                reference_number: "ET-20260225-001",
              });
            }
          }
        }
      }

      // For worker, seed worker profile name + demo visits for today
      if (account.role === "staff") {
        // Ensure worker_profile has correct name
        const { data: existingProfile } = await supabaseAdmin
          .from("worker_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingProfile) {
          await supabaseAdmin
            .from("worker_profiles")
            .update({ full_name: account.displayName })
            .eq("user_id", userId);
        } else {
          await supabaseAdmin.from("worker_profiles").insert({
            user_id: userId,
            full_name: account.displayName,
            employment_status: "active",
          });
        }

        // Seed demo customers, properties, jobs, and visits for today
        const todayStr = new Date().toISOString().split("T")[0];

        // Create demo customers if not exist
        const demoCustomers = [
          { first_name: "Troy", last_name: "Spanier", company_name: "Oleet Processing LTD", phone: "306-555-0201", address_line_1: "450 Broad Street", city: "Regina", province: "SK", postal_code: "S4R 1X3" },
          { first_name: "John", last_name: "Wall", company_name: null, phone: "306-555-0202", address_line_1: "921 Broad Street", city: "Regina", province: "SK", postal_code: "S4R 1Y1" },
          { first_name: "Sarah", last_name: "Chen", company_name: "Greenway Construction", phone: "306-555-0203", address_line_1: "175 Albert Street", city: "Regina", province: "SK", postal_code: "S4R 2N2" },
        ];

        const customerIds: string[] = [];
        for (const cust of demoCustomers) {
          const { data: existing } = await supabaseAdmin
            .from("customers")
            .select("id")
            .eq("first_name", cust.first_name)
            .eq("last_name", cust.last_name)
            .maybeSingle();

          if (existing) {
            customerIds.push(existing.id);
          } else {
            const { data: created } = await supabaseAdmin
              .from("customers")
              .insert(cust)
              .select("id")
              .single();
            if (created) customerIds.push(created.id);
          }
        }

        // Create demo properties
        const demoProperties = [
          { property_name: "Oleet Processing LTD", address_line_1: "450 Broad Street", city: "Regina", province: "SK", postal_code: "S4R 1X3", customer_id: customerIds[0] },
          { property_name: "921 Broad Street", address_line_1: "921 Broad Street", city: "Regina", province: "SK", postal_code: "S4R 1Y1", customer_id: customerIds[1] },
          { property_name: "Sherwin-Williams Paints", address_line_1: "175 Albert Street", city: "Regina", province: "SK", postal_code: "S4R 2N2", customer_id: customerIds[2] },
        ];

        const propertyIds: string[] = [];
        for (const prop of demoProperties) {
          if (!prop.customer_id) continue;
          const { data: existing } = await supabaseAdmin
            .from("properties")
            .select("id")
            .eq("property_name", prop.property_name)
            .eq("customer_id", prop.customer_id)
            .maybeSingle();

          if (existing) {
            propertyIds.push(existing.id);
          } else {
            const { data: created } = await supabaseAdmin
              .from("properties")
              .insert(prop)
              .select("id")
              .single();
            if (created) propertyIds.push(created.id);
          }
        }

        // Create demo jobs
        const demoJobs = [
          { job_title: "Snow Removal - Oleet", job_number: "JOB-DEMO-001", customer_id: customerIds[0], property_id: propertyIds[0], assigned_to: userId, status: "Active", service_category: "Snow removal", priority: "Normal" },
          { job_title: "Daily Litter Services", job_number: "JOB-DEMO-002", customer_id: customerIds[1], property_id: propertyIds[1], assigned_to: userId, status: "Active", service_category: "Property maintenance", priority: "Normal" },
          { job_title: "Snow Removal - Greenway", job_number: "JOB-DEMO-003", customer_id: customerIds[2], property_id: propertyIds[2], assigned_to: userId, status: "Active", service_category: "Snow removal", priority: "Normal" },
        ];

        const jobIds: string[] = [];
        for (const job of demoJobs) {
          if (!job.customer_id || !job.property_id) continue;
          const { data: existing } = await supabaseAdmin
            .from("jobs")
            .select("id")
            .eq("job_number", job.job_number)
            .maybeSingle();

          if (existing) {
            jobIds.push(existing.id);
          } else {
            const { data: created } = await supabaseAdmin
              .from("jobs")
              .insert(job)
              .select("id")
              .single();
            if (created) jobIds.push(created.id);
          }
        }

        // Create demo visits for today
        const demoVisits = [
          {
            visit_number: "VIS-DEMO-001",
            job_id: jobIds[0], customer_id: customerIds[0], property_id: propertyIds[0],
            assigned_worker_id: userId,
            service_date: todayStr, visit_status: "In Progress", visit_type: "Service",
            arrival_time: new Date(Date.now() - 83 * 60000).toISOString(),
            service_summary: "Snow removal and de-icing for commercial lot",
          },
          {
            visit_number: "VIS-DEMO-002",
            job_id: jobIds[1], customer_id: customerIds[1], property_id: propertyIds[1],
            assigned_worker_id: userId,
            service_date: todayStr, visit_status: "Scheduled", visit_type: "Service",
            service_summary: "Daily litter pickup and grounds maintenance",
          },
          {
            visit_number: "VIS-DEMO-003",
            job_id: jobIds[2], customer_id: customerIds[2], property_id: propertyIds[2],
            assigned_worker_id: userId,
            service_date: todayStr, visit_status: "Completed", visit_type: "Service",
            arrival_time: new Date(Date.now() - 180 * 60000).toISOString(),
            completion_time: new Date(Date.now() - 117 * 60000).toISOString(),
            service_summary: "Snow removal for commercial parking",
          },
        ];

        for (const visit of demoVisits) {
          if (!visit.job_id || !visit.customer_id || !visit.property_id) continue;
          const { data: existing } = await supabaseAdmin
            .from("visits")
            .select("id")
            .eq("visit_number", visit.visit_number)
            .maybeSingle();

          if (!existing) {
            await supabaseAdmin.from("visits").insert(visit);
          }
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
