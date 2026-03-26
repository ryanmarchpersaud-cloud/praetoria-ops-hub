import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user is authenticated and not a customer
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
    const {
      data: { user: callingUser },
    } = await anonClient.auth.getUser();
    if (!callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is staff/admin (not customer)
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id);

    const isCustomerRole = callerRoles?.some((r: any) => r.role === "customer");
    const isStaffOrNoRole =
      !callerRoles || callerRoles.length === 0 || !isCustomerRole;

    if (!isStaffOrNoRole) {
      return new Response(
        JSON.stringify({ error: "Only staff can invite customers" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { customer_id, email, password } = await req.json();

    if (!customer_id || !email || !password) {
      return new Response(
        JSON.stringify({
          error: "customer_id, email, and password are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check customer exists and doesn't already have a user_id
    const { data: customer, error: custErr } = await adminClient
      .from("customers")
      .select("id, first_name, last_name, user_id, email")
      .eq("id", customer_id)
      .single();

    if (custErr || !customer) {
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (customer.user_id) {
      return new Response(
        JSON.stringify({ error: "Customer already has a portal account" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create auth user with auto-confirm
    let newUserId: string;
    const { data: authData, error: authErr } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: `${customer.first_name} ${customer.last_name}`,
        },
      });

    if (authErr) {
      // If user already exists, look them up and reuse
      if (authErr.message?.includes("already been registered")) {
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
        if (!existingUser) {
          return new Response(JSON.stringify({ error: "Email exists but user not found" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        newUserId = existingUser.id;
      } else {
        return new Response(JSON.stringify({ error: authErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      newUserId = authData.user.id;
    }

    // Assign customer role
    const { error: roleErr } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUserId, role: "customer" });

    if (roleErr) {
      // Clean up: delete the auth user if role assignment fails
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "Failed to assign role: " + roleErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Link customer record to the new auth user
    const { error: linkErr } = await adminClient
      .from("customers")
      .update({ user_id: newUserId })
      .eq("id", customer_id);

    if (linkErr) {
      return new Response(
        JSON.stringify({
          error: "Account created but linking failed: " + linkErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update customer email if it was empty
    if (!customer.email) {
      await adminClient
        .from("customers")
        .update({ email })
        .eq("id", customer_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        message: `Portal account created for ${customer.first_name} ${customer.last_name}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
