import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const CREATE_SIMULATION_TOOL = {
  type: "function",
  function: {
    name: "create_draft_simulation",
    description:
      "Create a new draft cost simulation for an international employee assignment. Call this when the user has provided enough details (at minimum: employee name, origin country, destination country, and assignment type). Missing optional fields will use sensible defaults.",
    parameters: {
      type: "object",
      properties: {
        employee_name: {
          type: "string",
          description: "Full name of the employee being assigned",
        },
        origin_country: {
          type: "string",
          description: "Country the employee is relocating from",
        },
        destination_country: {
          type: "string",
          description: "Country the employee is relocating to",
        },
        assignment_type: {
          type: "string",
          enum: [
            "long-term",
            "short-term",
            "permanent-transfer",
            "commuter",
            "rotational",
          ],
          description: "Type of international assignment",
        },
        origin_city: {
          type: "string",
          description: "City the employee is relocating from (optional)",
        },
        destination_city: {
          type: "string",
          description: "City the employee is relocating to (optional)",
        },
        employee_id: {
          type: "string",
          description: "Employee ID or badge number (optional)",
        },
        job_title: {
          type: "string",
          description: "Employee's job title (optional)",
        },
        department: {
          type: "string",
          description: "Employee's department (optional)",
        },
        grade: {
          type: "string",
          description: "Employee's grade/level (optional)",
        },
        base_salary: {
          type: "number",
          description:
            "Annual base salary in the specified currency. Defaults to 0 if not provided.",
        },
        currency: {
          type: "string",
          description: "ISO currency code (e.g. USD, EUR, GBP). Defaults to USD.",
        },
        duration_months: {
          type: "number",
          description:
            "Duration of the assignment in months. Defaults to 24.",
        },
        policy_id: {
          type: "string",
          description:
            "UUID of the policy to apply. Only use if the user explicitly references a known policy by name and you have its ID from context.",
        },
        tax_approach: {
          type: "string",
          enum: ["tax-equalization", "tax-protection", "laissez-faire"],
          description:
            "Tax approach for the assignment. Defaults to tax-equalization.",
        },
        notes: {
          type: "string",
          description: "Any additional notes about the assignment.",
        },
      },
      required: [
        "employee_name",
        "origin_country",
        "destination_country",
        "assignment_type",
      ],
      additionalProperties: false,
    },
  },
};

const ADD_LOOKUP_ROW_TOOL = {
  type: "function",
  function: {
    name: "add_lookup_table_row",
    description:
      "Add a new row to an existing lookup table. Use this when the user wants to add an entry (e.g. a new exchange rate, a new COLA rate). You must know the lookup_table_id from context and provide the row data as key-value pairs matching the table's columns.",
    parameters: {
      type: "object",
      properties: {
        lookup_table_id: {
          type: "string",
          description: "UUID of the lookup table to add the row to",
        },
        row_data: {
          type: "object",
          description:
            "Key-value pairs for the row, where keys are column names and values are the cell values. Must match the table's column schema.",
          additionalProperties: true,
        },
      },
      required: ["lookup_table_id", "row_data"],
      additionalProperties: false,
    },
  },
};

const UPDATE_LOOKUP_ROW_TOOL = {
  type: "function",
  function: {
    name: "update_lookup_table_row",
    description:
      "Update an existing row in a lookup table. Use this when the user wants to change a value (e.g. update an exchange rate). You need the row_id (from context data) and the fields to update.",
    parameters: {
      type: "object",
      properties: {
        row_id: {
          type: "string",
          description: "UUID of the lookup_table_rows record to update",
        },
        row_data: {
          type: "object",
          description:
            "Key-value pairs to merge into the existing row_data. Only provided keys are updated; others are preserved.",
          additionalProperties: true,
        },
      },
      required: ["row_id", "row_data"],
      additionalProperties: false,
    },
  },
};

function handleAIError(status: number) {
  if (status === 429) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (status === 402) {
    return new Response(
      JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

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

    // Fetch user context data
    let contextBlock = "";
    let policiesData: any[] = [];
    if (includeContext) {
      const [policiesRes, simulationsRes, calculationsRes, lookupTablesRes] = await Promise.all([
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
        supabase
          .from("lookup_tables")
          .select("id, name, description, columns")
          .limit(50),
      ]);

      policiesData = policiesRes.data ?? [];
      const simulations = simulationsRes.data ?? [];
      const calculations = calculationsRes.data ?? [];
      const lookupTables = lookupTablesRes.data ?? [];

      // Fetch rows for each lookup table (limit per table to keep context manageable)
      let lookupDetails = "";
      if (lookupTables.length > 0) {
        const rowPromises = lookupTables.map((lt) =>
          supabase
            .from("lookup_table_rows")
            .select("id, row_data")
            .eq("lookup_table_id", lt.id)
            .order("row_order", { ascending: true })
            .limit(30)
        );
        const rowResults = await Promise.all(rowPromises);

        lookupDetails = lookupTables
          .map((lt, idx) => {
            const cols = Array.isArray(lt.columns)
              ? lt.columns.map((c: any) => c.name || c).join(", ")
              : "unknown columns";
            const rows = rowResults[idx]?.data ?? [];
            const rowsStr = rows.length
              ? rows
                  .map((r) => {
                    const d = r.row_data as Record<string, any>;
                    return `  [row_id=${r.id}] ` + Object.entries(d).map(([k, v]) => `${k}=${v}`).join(", ");
                  })
                  .join("\n")
              : "  (no rows)";
            return `- **"${lt.name}"** (id=${lt.id})${lt.description ? ` — ${lt.description}` : ""}\n  Columns: ${cols}\n  Data (up to 30 rows):\n${rowsStr}`;
          })
          .join("\n\n");
      }

      contextBlock = `

## User's Current Data

### Policies (${policiesData.length})
${policiesData.length ? policiesData.map((p) => `- "${p.name}" (id=${p.id}) [${p.status}] tier=${p.tier}, tax=${p.tax_approach}${p.description ? `, desc: ${p.description}` : ""}`).join("\n") : "No policies found."}

### Simulations (${simulations.length})
${simulations.length ? simulations.map((s) => `- ${s.sim_code}: ${s.employee_name} [${s.status}] ${s.origin_country}→${s.destination_country}, ${s.assignment_type}, salary=${s.base_salary} ${s.currency}${s.total_cost ? `, total=${s.total_cost}` : ""}`).join("\n") : "No simulations found."}

### Calculations (${calculations.length})
${calculations.length ? calculations.map((c) => `- "${c.name}" [${c.category || "uncategorized"}]${c.description ? ` — ${c.description}` : ""}`).join("\n") : "No calculations found."}

### Lookup Tables (${lookupTables.length})
${lookupTables.length ? lookupDetails : "No lookup tables found."}
`;
    }

    const systemPrompt = `You are the AI assistant for a Global Mobility Cost Simulation platform. You help HR and mobility professionals understand and manage:
- **Policies**: Assignment policies defining benefit packages, tiers, and tax approaches
- **Simulations**: Cost projections for international employee assignments
- **Calculations**: Benefit formulas (housing, COLA, tax equalization, etc.)
- **Tax**: Tax equalization, hypothetical tax, gross-up methods
- **Lookup Tables**: Reference data used in calculations (exchange rates, tax brackets, housing indices, COLA rates, etc.)

You have access to the user's actual data including lookup table contents. When answering questions about rates, allowances, or reference data, look up the relevant lookup table and cite specific values. For exchange rate questions, refer to the Exchange Rates table if available.

You have a tool called \`create_draft_simulation\` to create draft simulations. When the user wants to create a simulation:
1. Gather the required info conversationally: employee name, origin country, destination country, and assignment type.
2. Ask about optional details: salary, duration, city, department, policy, tax approach.
3. Once you have enough info (at least the 4 required fields), call the tool immediately.
4. If the user says something like "use defaults for the rest", go ahead and create with what you have.

You also have tools to manage lookup table data:
- \`add_lookup_table_row\`: Add a new row to a lookup table. Requires the lookup_table_id (from context) and row_data matching the table's columns.
- \`update_lookup_table_row\`: Update an existing row. Requires the row_id (shown as [row_id=...] in context) and the fields to change. Only provided fields are updated; others are preserved.

When adding or updating lookup data, confirm the action with the user before calling the tool. Each row in the context includes its row_id for reference.

Be concise, professional, and helpful. Use bullet points and formatting for clarity.
${contextBlock}`;

    const aiHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Step 1: Non-streaming call with tools to check for tool usage
    const initialResponse = await fetch(AI_URL, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: [CREATE_SIMULATION_TOOL, ADD_LOOKUP_ROW_TOOL, UPDATE_LOOKUP_ROW_TOOL],
        stream: false,
      }),
    });

    const errResp = handleAIError(initialResponse.status);
    if (errResp) return errResp;

    if (!initialResponse.ok) {
      const t = await initialResponse.text();
      console.error("AI gateway error:", initialResponse.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const initialData = await initialResponse.json();
    const choice = initialData.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    // Step 2: If tool was called, execute and get follow-up
    if (toolCalls && toolCalls.length > 0) {
      const toolResults: any[] = [];

      for (const tc of toolCalls) {
        if (tc.function.name === "create_draft_simulation") {
          const args = JSON.parse(tc.function.arguments);

          // Get user's tenant_id
          const { data: tenantUser } = await supabase
            .from("tenant_users")
            .select("tenant_id")
            .eq("user_id", user.id)
            .limit(1)
            .single();

          const tenantId = tenantUser?.tenant_id || null;

          const insertData: any = {
            employee_name: args.employee_name,
            origin_country: args.origin_country,
            destination_country: args.destination_country,
            assignment_type: args.assignment_type,
            owner_id: user.id,
            tenant_id: tenantId,
            status: "draft",
          };

          // Optional fields
          if (args.origin_city) insertData.origin_city = args.origin_city;
          if (args.destination_city) insertData.destination_city = args.destination_city;
          if (args.employee_id) insertData.employee_id = args.employee_id;
          if (args.job_title) insertData.job_title = args.job_title;
          if (args.department) insertData.department = args.department;
          if (args.grade) insertData.grade = args.grade;
          if (args.base_salary !== undefined) insertData.base_salary = args.base_salary;
          if (args.currency) insertData.currency = args.currency;
          if (args.duration_months) insertData.duration_months = args.duration_months;
          if (args.policy_id) insertData.policy_id = args.policy_id;
          if (args.tax_approach) insertData.tax_approach = args.tax_approach;
          if (args.notes) insertData.notes = args.notes;

          const { data: sim, error: simError } = await supabase
            .from("simulations")
            .insert(insertData)
            .select("id, sim_code, employee_name")
            .single();

          if (simError) {
            console.error("Simulation insert error:", simError);
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({
                success: false,
                error: simError.message,
              }),
            });
          } else {
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({
                success: true,
                simulation_id: sim.id,
                sim_code: sim.sim_code,
                employee_name: sim.employee_name,
              }),
            });
          }
        } else if (tc.function.name === "add_lookup_table_row") {
          const args = JSON.parse(tc.function.arguments);

          // Validate row_data is a plain object
          if (!args.row_data || typeof args.row_data !== "object" || Array.isArray(args.row_data)) {
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({ success: false, error: "row_data must be a JSON object" }),
            });
            continue;
          }

          // Sanitize values: trim strings, limit length
          const sanitized: Record<string, any> = {};
          for (const [k, v] of Object.entries(args.row_data)) {
            const key = String(k).slice(0, 100);
            sanitized[key] = typeof v === "string" ? v.slice(0, 500) : v;
          }

          // Get next row_order
          const { data: lastRow } = await supabase
            .from("lookup_table_rows")
            .select("row_order")
            .eq("lookup_table_id", args.lookup_table_id)
            .order("row_order", { ascending: false })
            .limit(1)
            .single();

          const nextOrder = (lastRow?.row_order ?? -1) + 1;

          const { data: newRow, error: rowError } = await supabase
            .from("lookup_table_rows")
            .insert({
              lookup_table_id: args.lookup_table_id,
              row_data: sanitized,
              row_order: nextOrder,
            })
            .select("id")
            .single();

          if (rowError) {
            console.error("Lookup row insert error:", rowError);
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({ success: false, error: rowError.message }),
            });
          } else {
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({
                success: true,
                row_id: newRow.id,
                row_data: sanitized,
              }),
            });
          }
        } else if (tc.function.name === "update_lookup_table_row") {
          const args = JSON.parse(tc.function.arguments);

          if (!args.row_data || typeof args.row_data !== "object" || Array.isArray(args.row_data)) {
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({ success: false, error: "row_data must be a JSON object" }),
            });
            continue;
          }

          // Fetch existing row first to merge
          const { data: existingRow, error: fetchErr } = await supabase
            .from("lookup_table_rows")
            .select("row_data")
            .eq("id", args.row_id)
            .single();

          if (fetchErr || !existingRow) {
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({ success: false, error: fetchErr?.message || "Row not found" }),
            });
            continue;
          }

          // Merge: existing values + new values (new overwrites)
          const existingData = (existingRow.row_data as Record<string, any>) || {};
          const mergedData: Record<string, any> = { ...existingData };
          for (const [k, v] of Object.entries(args.row_data)) {
            const key = String(k).slice(0, 100);
            mergedData[key] = typeof v === "string" ? v.slice(0, 500) : v;
          }

          const { error: updateErr } = await supabase
            .from("lookup_table_rows")
            .update({ row_data: mergedData })
            .eq("id", args.row_id);

          if (updateErr) {
            console.error("Lookup row update error:", updateErr);
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({ success: false, error: updateErr.message }),
            });
          } else {
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({
                success: true,
                row_id: args.row_id,
                updated_data: mergedData,
              }),
            });
          }
        }
      }

      // Step 3: Stream the follow-up response with tool results
      const followUpMessages = [
        { role: "system", content: systemPrompt },
        ...messages,
        choice.message, // assistant message with tool_calls
        ...toolResults,
      ];

      const followUpResponse = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: followUpMessages,
          stream: true,
        }),
      });

      const errResp2 = handleAIError(followUpResponse.status);
      if (errResp2) return errResp2;

      if (!followUpResponse.ok) {
        const t = await followUpResponse.text();
        console.error("AI follow-up error:", followUpResponse.status, t);
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prepend custom events for each created simulation, then pipe the AI stream
      const simEvents: string[] = [];
      for (const tr of toolResults) {
        const parsed = JSON.parse(tr.content);
        if (parsed.success) {
          simEvents.push(
            `event: simulation_created\ndata: ${JSON.stringify({
              id: parsed.simulation_id,
              sim_code: parsed.sim_code,
              employee_name: parsed.employee_name,
            })}\n\n`
          );
        }
      }

      const encoder = new TextEncoder();
      const prefixBytes = encoder.encode(simEvents.join(""));

      // Create a combined stream: prefix events + AI stream
      const aiBody = followUpResponse.body!;
      const combinedStream = new ReadableStream({
        async start(controller) {
          controller.enqueue(prefixBytes);
          const reader = aiBody.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        },
      });

      return new Response(combinedStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls — re-stream a normal response
    // Since we already consumed the non-streaming response, return it as SSE
    const content = choice?.message?.content || "";
    const ssePayload = `data: ${JSON.stringify({
      choices: [{ delta: { content } }],
    })}\n\ndata: [DONE]\n\n`;

    return new Response(ssePayload, {
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
