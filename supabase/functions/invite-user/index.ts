import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const callerId = claimsData.claims.sub;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller has admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["admin", "superadmin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { action, email, displayName, role, userId: targetUserId, password } = await req.json();

    // ─── List Auth Users (last_sign_in_at) ───────────────────────
    if (action === "list-auth-users") {
      const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (listError) {
        return new Response(JSON.stringify({ error: "Failed to list users" }), {
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const mapped = (listData.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        last_sign_in_at: u.last_sign_in_at,
      }));
      return new Response(JSON.stringify({ users: mapped }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── Delete User ───────────────────────────────────────────────
    if (action === "delete-user") {
      if (!targetUserId || typeof targetUserId !== "string") {
        return new Response(JSON.stringify({ error: "A valid user ID is required" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Prevent deleting yourself
      if (targetUserId === callerId) {
        return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (deleteError) {
        console.error("Delete user error:", deleteError);
        return new Response(JSON.stringify({ error: deleteError.message || "Failed to delete user" }), {
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ─── Admin Password Reset ────────────────────────────────────
    if (action === "reset-password") {
      if (!targetUserId || typeof targetUserId !== "string") {
        return new Response(JSON.stringify({ error: "A valid user ID is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { data: targetUser, error: userError } = await adminClient.auth.admin.getUserById(targetUserId);
      if (userError || !targetUser?.user?.email) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: targetUser.user.email,
      });

      if (linkError) {
        console.error("Reset link error:", linkError);
        return new Response(JSON.stringify({ error: "Failed to generate reset link" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(
        JSON.stringify({ success: true, email: targetUser.user.email }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ─── Create User (with password) ─────────────────────────────
    if (action === "create-user") {
      if (!email || typeof email !== "string") {
        return new Response(JSON.stringify({ error: "A valid email is required" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Create user with email confirmation required
      const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: false, // user must confirm via email
        user_metadata: { display_name: displayName || email },
      });

      if (createError) {
        console.error("Create user error:", createError);
        const userMessage = createError.message?.includes("already")
          ? "A user with this email already exists"
          : createError.message || "Failed to create user";
        return new Response(JSON.stringify({ error: userMessage }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Assign role
      if (role && role !== "superadmin" && createData.user) {
        await adminClient
          .from("user_roles")
          .update({ role })
          .eq("user_id", createData.user.id);
      }

      // Generate a signup confirmation link (sends confirmation email)
      const { error: confirmError } = await adminClient.auth.admin.generateLink({
        type: "signup",
        email,
        password,
      });

      if (confirmError) {
        console.error("Confirmation email error:", confirmError);
        // User was created but confirmation email failed — not fatal
      }

      return new Response(
        JSON.stringify({ success: true, userId: createData.user?.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ─── Invite User (default action) ────────────────────────────
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "A valid email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { display_name: displayName || email },
      });

    if (inviteError) {
      console.error("Invite error:", inviteError);
      const userMessage = inviteError.message?.includes("already")
        ? "This user has already been invited"
        : "Failed to invite user";
      return new Response(JSON.stringify({ error: userMessage }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (role && role !== "viewer" && inviteData.user) {
      await adminClient
        .from("user_roles")
        .update({ role })
        .eq("user_id", inviteData.user.id);
    }

    return new Response(
      JSON.stringify({ success: true, userId: inviteData.user?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error inviting user:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
