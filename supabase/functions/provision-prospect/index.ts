import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sub_tenant_id } = await req.json();
    if (!sub_tenant_id) {
      return new Response(
        JSON.stringify({ error: "sub_tenant_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the sub-tenant and verify it's a prospect under TopiaDemo
    const { data: subTenant, error: stErr } = await supabaseAdmin
      .from("sub_tenants")
      .select("*, tenants!inner(id, name, slug)")
      .eq("id", sub_tenant_id)
      .single();

    if (stErr || !subTenant) {
      return new Response(
        JSON.stringify({ error: "Sub-tenant not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!subTenant.is_prospect) {
      return new Response(
        JSON.stringify({ error: "Sub-tenant is not marked as a prospect" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tenantId = subTenant.tenant_id;
    const demoEmail = `demo@${subTenant.slug}.prospect.local`;
    const demoPassword = "topia2026!";

    // 1. Create demo user account
    const { data: authUser, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { display_name: "DemoUser" },
      });

    if (createErr) {
      // User might already exist
      if (!createErr.message.includes("already")) {
        throw createErr;
      }
    }

    const userId = authUser?.user?.id;

    if (userId) {
      // Assign admin role
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

      // Assign to tenant
      await supabaseAdmin
        .from("tenant_users")
        .upsert(
          {
            user_id: userId,
            tenant_id: tenantId,
            sub_tenant_id: sub_tenant_id,
            role: "tenant_admin",
          },
          { onConflict: "user_id,tenant_id" }
        );

      // Update sub-tenant with demo user info
      await supabaseAdmin
        .from("sub_tenants")
        .update({ demo_user_email: demoEmail, demo_user_id: userId })
        .eq("id", sub_tenant_id);
    }

    // 2. Copy baseline data to the new prospect sub-tenant
    // Find the baseline sub-tenant
    const { data: baseline } = await supabaseAdmin
      .from("sub_tenants")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("is_demo_baseline", true)
      .single();

    if (baseline) {
      const baselineId = baseline.id;
      const creatorId = userId || subTenant.tenant_id; // fallback

      // Copy employees
      const { data: baseEmployees } = await supabaseAdmin
        .from("employees")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("sub_tenant_id", baselineId);

      if (baseEmployees && baseEmployees.length > 0) {
        const empInserts = baseEmployees.map((e: any) => ({
          first_name: e.first_name,
          last_name: e.last_name,
          email: e.email,
          phone: e.phone,
          job_title: e.job_title,
          job_grade: e.job_grade,
          division: e.division,
          currency: e.currency,
          base_salary: e.base_salary,
          bonus_amount: e.bonus_amount,
          bonus_percent: e.bonus_percent,
          address_line1: e.address_line1,
          address_line2: e.address_line2,
          city: e.city,
          state_province: e.state_province,
          country: e.country,
          postal_code: e.postal_code,
          status: e.status,
          date_of_birth: e.date_of_birth,
          hire_date: e.hire_date,
          tenant_id: tenantId,
          sub_tenant_id: sub_tenant_id,
          created_by: creatorId,
        }));
        await supabaseAdmin.from("employees").insert(empInserts);
      }

      // Copy policies
      const { data: basePolicies } = await supabaseAdmin
        .from("policies")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("sub_tenant_id", baselineId);

      if (basePolicies && basePolicies.length > 0) {
        const polInserts = basePolicies.map((p: any) => ({
          name: p.name,
          description: p.description,
          status: p.status,
          tier: p.tier,
          tax_approach: p.tax_approach,
          benefit_components: p.benefit_components,
          tenant_id: tenantId,
          sub_tenant_id: sub_tenant_id,
          created_by: creatorId,
        }));
        await supabaseAdmin.from("policies").insert(polInserts);
      }

      // Copy calculations
      const { data: baseCalcs } = await supabaseAdmin
        .from("calculations")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("sub_tenant_id", baselineId);

      if (baseCalcs && baseCalcs.length > 0) {
        const calcInserts = baseCalcs.map((c: any) => ({
          name: c.name,
          description: c.description,
          category: c.category,
          formula: c.formula,
          proration_enabled: c.proration_enabled,
          proration_method: c.proration_method,
          step_down_enabled: c.step_down_enabled,
          step_down_schedule: c.step_down_schedule,
          tenant_id: tenantId,
          sub_tenant_id: sub_tenant_id,
          created_by: creatorId,
        }));
        await supabaseAdmin.from("calculations").insert(calcInserts);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        demo_email: demoEmail,
        demo_password: demoPassword,
        user_id: userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
