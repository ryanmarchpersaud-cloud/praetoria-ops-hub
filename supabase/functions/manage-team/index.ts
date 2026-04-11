import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callingUser } } = await anonClient.auth.getUser();
    if (!callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerRoles } = await adminClient
      .from("user_roles").select("role").eq("user_id", callingUser.id);

    const isAdmin = callerRoles?.some((r: any) => ["admin", "owner"].includes(r.role));
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can manage team members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    // ── CREATE USER (Employee/Worker) ──
    if (action === "create_user") {
      const {
        email, password, full_name, role, phone, team_type,
        service_categories, notes, portal_admin, portal_worker, portal_subcontractor,
        role_title, department, employment_type, branch_location, primary_service_category,
        hire_date,
        // New personal fields
        address_line_1, address_city, address_province, address_postal_code,
        date_of_birth, gender, ethnicity, religion, sin_encrypted,
        driver_license_number, driver_license_class, driver_license_expiry,
        pay_type, pay_schedule, hourly_rate,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        referral_source,
      } = body;

      if (!email || !password || !role) {
        return new Response(
          JSON.stringify({ error: "email, password, and role are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: full_name || email },
      });
      if (authErr) {
        return new Response(JSON.stringify({ error: authErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newUserId = authData.user.id;
      await adminClient.from("user_roles").insert({ user_id: newUserId, role });

      await adminClient.from("team_members").insert({
        user_id: newUserId,
        full_name: full_name || email,
        email,
        phone: phone || null,
        team_type: team_type || (role === 'admin' ? 'Admin' : role === 'subcontractor' ? 'Subcontractor' : 'Worker'),
        status: 'Active', is_active: true,
        service_categories: service_categories || [],
        notes: notes || null,
        portal_admin: portal_admin || role === 'admin',
        portal_worker: portal_worker || role === 'staff',
        portal_subcontractor: portal_subcontractor || role === 'subcontractor',
      });

      if (["staff", "lead_worker", "supervisor", "dispatcher", "manager", "admin", "hr_admin", "ops_manager", "accountant"].includes(role)) {
        const { data: existingWp } = await adminClient
          .from("worker_profiles").select("id").eq("user_id", newUserId).maybeSingle();

        if (!existingWp) {
          await adminClient.from("worker_profiles").insert({
            user_id: newUserId,
            full_name: full_name || email,
            work_email: email,
            phone: phone || null,
            employment_status: "active",
            employment_type: employment_type || "full-time",
            role_title: role_title || null,
            team: department || null,
            branch_location: branch_location || null,
            primary_service_category: primary_service_category || (service_categories?.[0] || null),
            hire_date: hire_date || new Date().toISOString().split('T')[0],
            // Personal
            address_line_1: address_line_1 || null,
            address_city: address_city || null,
            address_province: address_province || null,
            address_postal_code: address_postal_code || null,
            date_of_birth: date_of_birth || null,
            gender: gender || null,
            ethnicity: ethnicity || null,
            religion: religion || null,
            sin_encrypted: sin_encrypted || null,
            driver_license_number: driver_license_number || null,
            driver_license_class: driver_license_class || null,
            driver_license_expiry: driver_license_expiry || null,
            pay_type: pay_type || null,
            pay_schedule: pay_schedule || null,
            hourly_rate: hourly_rate || null,
            emergency_contact_name: emergency_contact_name || null,
            emergency_contact_phone: emergency_contact_phone || null,
            emergency_contact_relationship: emergency_contact_relationship || null,
            referral_source: referral_source || null,
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, user_id: newUserId, message: `Account created for ${full_name || email}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CREATE SUBCONTRACTOR ──
    if (action === "create_subcontractor") {
      const {
        email, password, company_name, contact_name, phone,
        service_area_summary, notes, business_number, mailing_address,
        // Personal
        date_of_birth, gender, ethnicity, religion, sin_encrypted,
        driver_license_number, driver_license_class, driver_license_expiry,
        pay_type, pay_schedule, hourly_rate,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        referral_source,
      } = body;

      if (!email || !password || !company_name || !contact_name) {
        return new Response(
          JSON.stringify({ error: "email, password, company_name, and contact_name are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: contact_name },
      });
      if (authErr) {
        return new Response(JSON.stringify({ error: authErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newUserId = authData.user.id;
      await adminClient.from("user_roles").insert({ user_id: newUserId, role: "subcontractor" });

      await adminClient.from("team_members").insert({
        user_id: newUserId, full_name: contact_name, email,
        phone: phone || null, team_type: "Subcontractor",
        status: "Active", is_active: true, service_categories: [],
        notes: notes || null,
        portal_admin: false, portal_worker: false, portal_subcontractor: true,
      });

      await adminClient.from("subcontractors").insert({
        user_id: newUserId,
        company_name, contact_name,
        email, phone: phone || null,
        service_area_summary: service_area_summary || null,
        business_number: business_number || null,
        mailing_address: mailing_address || null,
        notes_admin_only: notes || null,
        status: "active", onboarding_status: "pending",
        // Personal
        date_of_birth: date_of_birth || null,
        gender: gender || null,
        ethnicity: ethnicity || null,
        religion: religion || null,
        sin_encrypted: sin_encrypted || null,
        driver_license_number: driver_license_number || null,
        driver_license_class: driver_license_class || null,
        driver_license_expiry: driver_license_expiry || null,
        pay_type: pay_type || null,
        pay_schedule: pay_schedule || null,
        hourly_rate: hourly_rate || null,
        referral_source: referral_source || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        emergency_contact_relationship: emergency_contact_relationship || null,
      });

      return new Response(
        JSON.stringify({ success: true, user_id: newUserId, message: `Subcontractor "${company_name}" created` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── UPDATE ROLE ──
    if (action === "update_role") {
      const { user_id, new_role, old_role } = body;
      if (!user_id || !new_role) {
        return new Response(JSON.stringify({ error: "user_id and new_role are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (user_id === callingUser.id && new_role !== "admin") {
        return new Response(JSON.stringify({ error: "You cannot remove your own admin role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (old_role) await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", old_role);
      const { data: existing } = await adminClient.from("user_roles").select("id").eq("user_id", user_id).eq("role", new_role).maybeSingle();
      if (!existing) await adminClient.from("user_roles").insert({ user_id, role: new_role });
      return new Response(JSON.stringify({ success: true, message: `Role updated to ${new_role}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── UPDATE TEAM MEMBER ──
    if (action === "update_team_member") {
      const { user_id, updates } = body;
      if (!user_id || !updates) {
        return new Response(JSON.stringify({ error: "user_id and updates are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: existing } = await adminClient.from("team_members").select("id").eq("user_id", user_id).maybeSingle();
      if (existing) {
        const { error } = await adminClient.from("team_members").update(updates).eq("user_id", user_id);
        if (error) throw error;
      } else {
        const { error } = await adminClient.from("team_members").insert({ user_id, ...updates });
        if (error) throw error;
      }
      if (updates.display_name !== undefined || updates.full_name !== undefined) {
        await adminClient.from("profiles").update({ display_name: updates.display_name || updates.full_name }).eq("user_id", user_id);
      }
      return new Response(JSON.stringify({ success: true, message: "Team member updated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── DEACTIVATE USER ──
    if (action === "deactivate_user") {
      const { user_id } = body;
      if (!user_id) return new Response(JSON.stringify({ error: "user_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (user_id === callingUser.id) return new Response(JSON.stringify({ error: "You cannot deactivate yourself" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error: banErr } = await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
      if (banErr) return new Response(JSON.stringify({ error: banErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await adminClient.from("team_members").update({ status: "Inactive", is_active: false }).eq("user_id", user_id);
      await adminClient.from("worker_profiles").update({ employment_status: "inactive" }).eq("user_id", user_id);
      return new Response(JSON.stringify({ success: true, message: "User deactivated" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── REACTIVATE USER ──
    if (action === "reactivate_user") {
      const { user_id } = body;
      if (!user_id) return new Response(JSON.stringify({ error: "user_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error: unbanErr } = await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      if (unbanErr) return new Response(JSON.stringify({ error: unbanErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await adminClient.from("team_members").update({ status: "Active", is_active: true }).eq("user_id", user_id);
      await adminClient.from("worker_profiles").update({ employment_status: "active" }).eq("user_id", user_id);
      return new Response(JSON.stringify({ success: true, message: "User reactivated" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── ARCHIVE USER ──
    if (action === "archive_user") {
      const { user_id } = body;
      if (!user_id) return new Response(JSON.stringify({ error: "user_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
      await adminClient.from("team_members").update({ status: "Archived", is_active: false }).eq("user_id", user_id);
      return new Response(JSON.stringify({ success: true, message: "User archived" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── GET USER STATUSES ──
    if (action === "get_user_statuses") {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const statuses = users.map((u: any) => ({
        user_id: u.id, email: u.email,
        banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
        last_sign_in: u.last_sign_in_at, created_at: u.created_at,
      }));
      return new Response(JSON.stringify({ success: true, statuses }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
