import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    // Create authenticated supabase client to query user data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { messages, includeContext } = await req.json();

    // Fetch user context data in parallel if first message or requested
    let contextBlock = "";
    if (includeContext) {
      const [policiesRes, simulationsRes, calculationsRes] = await Promise.all([
        supabase
          .from("policies")
          .select("id, name, status, tier, tax_approach, description")
          .limit(50),
        supabase
          .from("simulations")
          .select(
            "id, sim_code, employee_name, status, origin_country, destination_country, assignment_type, base_salary, currency, total_cost"
          )
          .limit(50),
        supabase
          .from("calculations")
          .select("id, name, category, description, formula")
          .limit(50),
      ]);

      const policies = policiesRes.data ?? [];
      const simulations = simulationsRes.data ?? [];
      const calculations = calculationsRes.data ?? [];

      contextBlock = `

## User's Current Data

### Policies (${policies.length})
${policies.length ? policies.map((p) => `- "${p.name}" [${p.status}] tier=${p.tier}, tax=${p.tax_approach}${p.description ? `, desc: ${p.description}` : ""}`).join("\n") : "No policies found."}

### Simulations (${simulations.length})
${simulations.length ? simulations.map((s) => `- ${s.sim_code}: ${s.employee_name} [${s.status}] ${s.origin_country}→${s.destination_country}, ${s.assignment_type}, salary=${s.base_salary} ${s.currency}${s.total_cost ? `, total=${s.total_cost}` : ""}`).join("\n") : "No simulations found."}

### Calculations (${calculations.length})
${calculations.length ? calculations.map((c) => `- "${c.name}" [${c.category || "uncategorized"}]${c.description ? ` — ${c.description}` : ""}`).join("\n") : "No calculations found."}
`;
    }

    const systemPrompt = `You are the AI assistant for a Global Mobility Cost Simulation platform. You help HR and mobility professionals understand and manage:
- **Policies**: Assignment policies defining benefit packages, tiers, and tax approaches
- **Simulations**: Cost projections for international employee assignments
- **Calculations**: Benefit formulas (housing, COLA, tax equalization, etc.)
- **Tax**: Tax equalization, hypothetical tax, gross-up methods

You have access to the user's actual data. Provide specific, actionable answers referencing their policies, simulations, and calculations by name when relevant.

When the user wants to start a simulation, guide them step by step: employee details, origin/destination, assignment type, policy selection, and salary information. Explain what each field means.

Be concise, professional, and helpful. Use bullet points and formatting for clarity.
${contextBlock}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
