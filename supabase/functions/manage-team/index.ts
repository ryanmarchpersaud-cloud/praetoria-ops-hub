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

    // Verify calling user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callingUser } } = await anonClient.auth.getUser();
    if (!callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is admin
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id);

    const isAdmin = callerRoles?.some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can manage team members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    // ── CREATE USER ──
    if (action === "create_user") {
      const { email, password, full_name, role } = body;
      if (!email || !password || !role) {
        return new Response(
          JSON.stringify({ error: "email, password, and role are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || email },
      });

      if (authErr) {
        return new Response(JSON.stringify({ error: authErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newUserId = authData.user.id;

      // Assign role
      await adminClient.from("user_roles").insert({ user_id: newUserId, role });

      // If staff, create employee record
      if (role === "staff") {
        const { data: existingEmp } = await adminClient
          .from("employees")
          .select("id")
          .eq("user_id", newUserId)
          .maybeSingle();

        if (!existingEmp) {
          await adminClient.from("employees").insert({
            user_id: newUserId,
            full_name: full_name || email,
            work_email: email,
            employment_status: "active",
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, user_id: newUserId, message: `Account created for ${full_name || email}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── UPDATE ROLE ──
    if (action === "update_role") {
      const { user_id, new_role, old_role } = body;
      if (!user_id || !new_role) {
        return new Response(
          JSON.stringify({ error: "user_id and new_role are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent self-demotion from admin
      if (user_id === callingUser.id && new_role !== "admin") {
        return new Response(
          JSON.stringify({ error: "You cannot remove your own admin role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Remove old role if specified
      if (old_role) {
        await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", old_role);
      }

      // Upsert new role
      const { data: existing } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", user_id)
        .eq("role", new_role)
        .maybeSingle();

      if (!existing) {
        await adminClient.from("user_roles").insert({ user_id, role: new_role });
      }

      return new Response(
        JSON.stringify({ success: true, message: `Role updated to ${new_role}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── DEACTIVATE USER ──
    if (action === "deactivate_user") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (user_id === callingUser.id) {
        return new Response(
          JSON.stringify({ error: "You cannot deactivate yourself" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Ban the user (prevents login)
      const { error: banErr } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h", // ~100 years
      });

      if (banErr) {
        return new Response(JSON.stringify({ error: banErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update employee status if applicable
      await adminClient
        .from("employees")
        .update({ employment_status: "inactive" })
        .eq("user_id", user_id);

      return new Response(
        JSON.stringify({ success: true, message: "User deactivated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── REACTIVATE USER ──
    if (action === "reactivate_user") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Unban the user
      const { error: unbanErr } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });

      if (unbanErr) {
        return new Response(JSON.stringify({ error: unbanErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update employee status if applicable
      await adminClient
        .from("employees")
        .update({ employment_status: "active" })
        .eq("user_id", user_id);

      return new Response(
        JSON.stringify({ success: true, message: "User reactivated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GET USER STATUS (banned or not) ──
    if (action === "get_user_statuses") {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statuses = users.map((u: any) => ({
        user_id: u.id,
        email: u.email,
        banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
        last_sign_in: u.last_sign_in_at,
        created_at: u.created_at,
      }));

      return new Response(
        JSON.stringify({ success: true, statuses }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
