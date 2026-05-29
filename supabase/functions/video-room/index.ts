import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Twilio Video Access Token generation using HMAC-SHA256
// Based on Twilio's AccessToken JWT spec
async function generateTwilioAccessToken(
  accountSid: string,
  apiKeySid: string,
  apiKeySecret: string,
  identity: string,
  roomName: string
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT", cty: "twilio-fpa;v=1" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    jti: `${apiKeySid}-${now}`,
    iss: apiKeySid,
    sub: accountSid,
    iat: now,
    exp: now + 3600, // 1 hour
    grants: {
      identity,
      video: { room: roomName },
    },
  };

  const enc = new TextEncoder();
  const b64url = (buf: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(buf instanceof ArrayBuffer ? buf : buf)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(apiKeySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));

  return `${signingInput}.${b64url(signature)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, conversation_id, room_name } = await req.json();

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim();
    const apiKeySid = Deno.env.get("TWILIO_VIDEO_API_KEY_SID")?.trim();
    const apiKeySecret = Deno.env.get("TWILIO_VIDEO_API_KEY_SECRET")?.trim();

    if (!accountSid || !apiKeySid || !apiKeySecret) {
      return new Response(JSON.stringify({ error: "Twilio Video credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      // Verify caller is a member of the conversation before creating a call
      if (!conversation_id) {
        return new Response(JSON.stringify({ error: "conversation_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: membership } = await supabase
        .from("conversation_members")
        .select("id")
        .eq("conversation_id", conversation_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: "Forbidden: not a member of this conversation" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create a new video room
      const generatedRoomName = `praetoria-${conversation_id}-${Date.now()}`;

      // Create room via Twilio REST API
      const twilioAuth = btoa(`${accountSid}:${apiKeySecret}`);
      // Use API Key SID + Secret for auth, but Twilio REST API for rooms uses Account SID + Auth Token
      // For API Key auth, we use the main account credentials
      const roomResponse = await fetch(`https://video.twilio.com/v1/Rooms`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${apiKeySid}:${apiKeySecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          UniqueName: generatedRoomName,
          Type: "group",
          MaxParticipants: "10",
          StatusCallback: "", // Can add webhook later
        }),
      });

      let roomSid = null;
      if (roomResponse.ok) {
        const roomData = await roomResponse.json();
        roomSid = roomData.sid;
      } else {
        // Room might already exist or Twilio error — continue with token generation
        console.error("Room creation response:", roomResponse.status, await roomResponse.text());
      }

      // Get user display name for identity
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("full_name, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const identity = teamMember?.full_name || teamMember?.display_name || user.email || user.id;

      // Generate access token
      const token = await generateTwilioAccessToken(
        accountSid,
        apiKeySid,
        apiKeySecret,
        identity,
        generatedRoomName
      );

      // Save video call record using service role
      const serviceClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: callRecord, error: insertError } = await serviceClient
        .from("video_calls")
        .insert({
          conversation_id,
          room_name: generatedRoomName,
          room_sid: roomSid,
          status: "active",
          started_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
      }

      return new Response(
        JSON.stringify({
          token,
          room_name: generatedRoomName,
          room_sid: roomSid,
          video_call_id: callRecord?.id,
          identity,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "join") {
      // Join existing room — generate a token for the given room
      if (!room_name) {
        return new Response(JSON.stringify({ error: "room_name required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the caller is a member of the conversation linked to this room
      const { data: callRec } = await supabase
        .from("video_calls")
        .select("conversation_id")
        .eq("room_name", room_name)
        .maybeSingle();

      if (!callRec?.conversation_id) {
        return new Response(JSON.stringify({ error: "Room not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: membership } = await supabase
        .from("conversation_members")
        .select("id")
        .eq("conversation_id", callRec.conversation_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Forbidden: not a member of this conversation" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: teamMember } = await supabase
        .from("team_members")
        .select("full_name, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const identity = teamMember?.full_name || teamMember?.display_name || user.email || user.id;

      const token = await generateTwilioAccessToken(
        accountSid,
        apiKeySid,
        apiKeySecret,
        identity,
        room_name
      );

      return new Response(
        JSON.stringify({ token, room_name, identity }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "end") {
      // End video call — update record
      if (!room_name) {
        return new Response(JSON.stringify({ error: "room_name required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const serviceClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Verify caller is allowed to end this call: must be the starter,
      // an ops/admin user, or a member of the call's conversation.
      const { data: existing } = await serviceClient
        .from("video_calls")
        .select("conversation_id, started_by")
        .eq("room_name", room_name)
        .maybeSingle();
      if (!existing) {
        return new Response(JSON.stringify({ error: "Room not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let authorized = existing.started_by === user.id;
      if (!authorized) {
        const { data: m } = await supabase
          .from("conversation_members")
          .select("id")
          .eq("conversation_id", existing.conversation_id)
          .eq("user_id", user.id)
          .maybeSingle();
        authorized = !!m;
      }
      if (!authorized) {
        const { data: isOps } = await serviceClient.rpc("is_ops_staff", { _user_id: user.id });
        authorized = !!isOps;
      }
      if (!authorized) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await serviceClient
        .from("video_calls")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("room_name", room_name);

      if (updateError) console.error("Update error:", updateError);

      // Complete the Twilio room
      await fetch(`https://video.twilio.com/v1/Rooms/${room_name}`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${apiKeySid}:${apiKeySecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ Status: "completed" }),
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Video room error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
