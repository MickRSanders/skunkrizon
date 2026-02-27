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

const UPDATE_CALCULATION_TOOL = {
  type: "function",
  function: {
    name: "update_calculation",
    description:
      "Update an existing calculation's metadata (name, description, category, or formula). Use this when an admin user wants to rename, re-describe, re-categorize, or change the formula of a calculation. Requires the calculation id from context.",
    parameters: {
      type: "object",
      properties: {
        calculation_id: {
          type: "string",
          description: "UUID of the calculation to update",
        },
        name: {
          type: "string",
          description: "New name for the calculation (optional)",
        },
        description: {
          type: "string",
          description: "New description (optional)",
        },
        category: {
          type: "string",
          description: "New category (optional)",
        },
        formula: {
          type: "string",
          description: "New formula expression (optional)",
        },
      },
      required: ["calculation_id"],
      additionalProperties: false,
    },
  },
};

const UPDATE_CALCULATION_FIELD_TOOL = {
  type: "function",
  function: {
    name: "update_calculation_field",
    description:
      "Update an existing calculation field's properties (label, name, field_type, default_value, position). Use this when an admin user wants to modify a field on a calculation. Requires the field id from context.",
    parameters: {
      type: "object",
      properties: {
        field_id: {
          type: "string",
          description: "UUID of the calculation_field to update",
        },
        label: {
          type: "string",
          description: "New display label (optional)",
        },
        name: {
          type: "string",
          description: "New field name / key (optional)",
        },
        field_type: {
          type: "string",
          description: "New field type e.g. number, text, percentage (optional)",
        },
        default_value: {
          type: "string",
          description: "New default value (optional)",
        },
        position: {
          type: "number",
          description: "New sort position (optional)",
        },
      },
      required: ["field_id"],
      additionalProperties: false,
    },
  },
};

const CREATE_POLICY_TOOL = {
  type: "function",
  function: {
    name: "create_policy",
    description:
      "Create a new draft policy for international assignments. Call this when an admin user wants to create/upload a policy. Gather at minimum the policy name. Optional: tier, description, tax approach, and benefit components. The policy is created in draft status and can be configured further.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the policy (required)",
        },
        tier: {
          type: "string",
          enum: ["gold", "silver", "bronze", "custom"],
          description: "Policy tier level. Defaults to custom.",
        },
        description: {
          type: "string",
          description: "Brief description of the policy (optional)",
        },
        tax_approach: {
          type: "string",
          enum: ["tax-equalization", "tax-protection", "laissez-faire"],
          description: "Tax approach. Defaults to tax-equalization.",
        },
        benefit_components: {
          type: "array",
          description: "Array of benefit components to include in the policy",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Component name (e.g. Housing Allowance)" },
              type: { type: "string", description: "Type: Allowance, Benefit, One-time, Tax" },
              taxable: { type: "string", description: "Taxability: Host only, Both, Non-taxable, N/A" },
              calcMethod: { type: "string", description: "How it's calculated" },
              amount: { type: "string", description: "Amount or limit" },
            },
            required: ["name"],
          },
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
};

const UPDATE_POLICY_TOOL = {
  type: "function",
  function: {
    name: "update_policy",
    description:
      "Update an existing policy's metadata (name, description, tier, tax_approach, status, or benefit_components). Use this when an admin user wants to modify a policy. Requires the policy id from context. To publish a policy, set status to 'published'.",
    parameters: {
      type: "object",
      properties: {
        policy_id: {
          type: "string",
          description: "UUID of the policy to update",
        },
        name: { type: "string", description: "New policy name (optional)" },
        description: { type: "string", description: "New description (optional)" },
        tier: {
          type: "string",
          enum: ["gold", "silver", "bronze", "custom"],
          description: "New tier (optional)",
        },
        tax_approach: {
          type: "string",
          enum: ["tax-equalization", "tax-protection", "laissez-faire"],
          description: "New tax approach (optional)",
        },
        status: {
          type: "string",
          enum: ["draft", "published"],
          description: "New status (optional). Set to 'published' to activate.",
        },
        benefit_components: {
          type: "array",
          description: "Replacement benefit components array (replaces existing). Optional.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              taxable: { type: "string" },
              calcMethod: { type: "string" },
              amount: { type: "string" },
              calculationId: { type: "string", description: "UUID of linked calculation (optional)" },
            },
            required: ["name"],
          },
        },
      },
      required: ["policy_id"],
      additionalProperties: false,
    },
  },
};

const CREATE_REMOTE_WORK_REQUEST_TOOL = {
  type: "function",
  function: {
    name: "create_remote_work_request",
    description:
      "Create a new remote work or virtual assignment request. Call this when the user wants to initiate a remote work request. At minimum requires: employee_name, home_country, host_country, start_date, and request_type.",
    parameters: {
      type: "object",
      properties: {
        request_type: {
          type: "string",
          enum: ["employee_remote", "virtual_assignment"],
          description: "Type of request: employee-driven remote work or virtual assignment",
        },
        employee_name: {
          type: "string",
          description: "Full name of the employee",
        },
        employee_email: {
          type: "string",
          description: "Employee email (optional)",
        },
        job_title: {
          type: "string",
          description: "Employee's job title (optional)",
        },
        department: {
          type: "string",
          description: "Employee's department (optional)",
        },
        home_country: {
          type: "string",
          description: "Employee's home/origin country",
        },
        home_city: {
          type: "string",
          description: "Employee's home city (optional)",
        },
        host_country: {
          type: "string",
          description: "Country where the employee will work remotely",
        },
        host_city: {
          type: "string",
          description: "City where the employee will work remotely (optional)",
        },
        start_date: {
          type: "string",
          description: "Start date in YYYY-MM-DD format",
        },
        end_date: {
          type: "string",
          description: "End date in YYYY-MM-DD format (optional for indefinite)",
        },
        duration_type: {
          type: "string",
          enum: ["short_term", "extended", "indefinite"],
          description: "Duration category. Defaults to short_term.",
        },
        purpose: {
          type: "string",
          description: "Purpose of the remote work (optional)",
        },
        business_justification: {
          type: "string",
          description: "Business justification (optional)",
        },
        notes: {
          type: "string",
          description: "Additional notes (optional)",
        },
      },
      required: ["request_type", "employee_name", "home_country", "host_country", "start_date"],
      additionalProperties: false,
    },
  },
};

const CREATE_TRIP_TOOL = {
  type: "function",
  function: {
    name: "create_trip",
    description:
      "Create a new pre-travel assessment trip for compliance evaluation. Call this when the user wants to initiate a business trip for compliance screening. At minimum requires: traveler_name and at least one segment with origin_country, destination_country, start_date, and end_date.",
    parameters: {
      type: "object",
      properties: {
        traveler_name: {
          type: "string",
          description: "Full name of the traveler",
        },
        traveler_email: {
          type: "string",
          description: "Traveler's email (optional)",
        },
        citizenship: {
          type: "string",
          description: "Traveler's citizenship country (optional)",
        },
        passport_country: {
          type: "string",
          description: "Passport issuing country (optional)",
        },
        residency_country: {
          type: "string",
          description: "Country of residency (optional)",
        },
        purpose: {
          type: "string",
          description: "Purpose of the trip (optional)",
        },
        notes: {
          type: "string",
          description: "Additional notes (optional)",
        },
        segments: {
          type: "array",
          description: "Array of trip segments (itinerary legs). At least one is required.",
          items: {
            type: "object",
            properties: {
              origin_country: { type: "string", description: "Departure country" },
              origin_city: { type: "string", description: "Departure city (optional)" },
              destination_country: { type: "string", description: "Arrival country" },
              destination_city: { type: "string", description: "Arrival city (optional)" },
              start_date: { type: "string", description: "Start date YYYY-MM-DD" },
              end_date: { type: "string", description: "End date YYYY-MM-DD" },
              activity_type: {
                type: "string",
                description: "Activity type e.g. client_meeting, conference, project_work, training. Defaults to client_meeting.",
              },
              activity_description: { type: "string", description: "Description of activity (optional)" },
            },
            required: ["origin_country", "destination_country", "start_date", "end_date"],
          },
        },
      },
      required: ["traveler_name", "segments"],
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

    const { messages, includeContext, tenant_id: requestTenantId } = await req.json();

    // Fetch user context data
    let contextBlock = "";
    let policiesData: any[] = [];
    if (includeContext) {
      const [policiesRes, simulationsRes, calculationsRes, lookupTablesRes, remoteWorkRes, tripsRes] = await Promise.all([
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
        supabase
          .from("remote_work_requests")
          .select("id, request_code, request_type, employee_name, home_country, home_city, host_country, host_city, start_date, end_date, duration_type, status, overall_risk_level, purpose")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("trips")
          .select("id, trip_code, traveler_name, status, purpose, created_at")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      policiesData = policiesRes.data ?? [];
      const simulations = simulationsRes.data ?? [];
      const calculations = calculationsRes.data ?? [];
      const lookupTables = lookupTablesRes.data ?? [];
      const remoteWorkRequests = remoteWorkRes.data ?? [];
      const trips = tripsRes.data ?? [];

      // Fetch trip segments for context
      let tripSegmentsBlock = "";
      if (trips.length > 0) {
        const tripIds = trips.map((t: any) => t.id);
        const { data: segments } = await supabase
          .from("trip_segments")
          .select("trip_id, origin_country, origin_city, destination_country, destination_city, start_date, end_date, activity_type")
          .in("trip_id", tripIds)
          .order("segment_order");
        
        const segsByTrip = (segments ?? []).reduce((acc: Record<string, any[]>, s: any) => {
          if (!acc[s.trip_id]) acc[s.trip_id] = [];
          acc[s.trip_id].push(s);
          return acc;
        }, {});

        tripSegmentsBlock = trips.map((t: any) => {
          const segs = segsByTrip[t.id] ?? [];
          const segsStr = segs.length
            ? segs.map((s: any) => `    ${s.origin_country}${s.origin_city ? ` (${s.origin_city})` : ""} → ${s.destination_country}${s.destination_city ? ` (${s.destination_city})` : ""}, ${s.start_date} to ${s.end_date}, activity=${s.activity_type}`).join("\n")
            : "    (no segments)";
          return `- ${t.trip_code}: ${t.traveler_name} [${t.status}]${t.purpose ? `, purpose: ${t.purpose}` : ""}\n  Segments:\n${segsStr}`;
        }).join("\n");
      }

      // Build calculation fields context
      const { data: allCalcFields } = await supabase
        .from("calculation_fields")
        .select("id, calculation_id, name, label, field_type, default_value, position")
        .order("position");
      const calcFieldsByCalc = (allCalcFields ?? []).reduce((acc: Record<string, any[]>, f: any) => {
        if (!acc[f.calculation_id]) acc[f.calculation_id] = [];
        acc[f.calculation_id].push(f);
        return acc;
      }, {});

      // Fetch rows for each lookup table
      let lookupDetails = "";
      if (lookupTables.length > 0) {
        const rowPromises = lookupTables.map((lt: any) =>
          supabase
            .from("lookup_table_rows")
            .select("id, row_data")
            .eq("lookup_table_id", lt.id)
            .order("row_order", { ascending: true })
            .limit(30)
        );
        const rowResults = await Promise.all(rowPromises);

        lookupDetails = lookupTables
          .map((lt: any, idx: number) => {
            const cols = Array.isArray(lt.columns)
              ? lt.columns.map((c: any) => c.name || c).join(", ")
              : "unknown columns";
            const rows = rowResults[idx]?.data ?? [];
            const rowsStr = rows.length
              ? rows
                  .map((r: any) => {
                    const d = r.row_data as Record<string, any>;
                    return `  [row_id=${r.id}] ` + Object.entries(d).map(([k, v]) => `${k}=${v}`).join(", ");
                  })
                  .join("\n")
              : "  (no rows)";
            return `- **"${lt.name}"** (id=${lt.id})${lt.description ? ` — ${lt.description}` : ""}\n  Columns: ${cols}\n  Data (up to 30 rows):\n${rowsStr}`;
          })
          .join("\n\n");
      }

      // Fetch remote work risk assessments for recent requests
      let rwRiskBlock = "";
      if (remoteWorkRequests.length > 0) {
        const rwIds = remoteWorkRequests.slice(0, 10).map((r: any) => r.id);
        const { data: risks } = await supabase
          .from("remote_work_risk_assessments")
          .select("request_id, category, risk_level, summary")
          .in("request_id", rwIds);
        
        const risksByReq = (risks ?? []).reduce((acc: Record<string, any[]>, r: any) => {
          if (!acc[r.request_id]) acc[r.request_id] = [];
          acc[r.request_id].push(r);
          return acc;
        }, {});

        rwRiskBlock = remoteWorkRequests.map((r: any) => {
          const reqRisks = risksByReq[r.id] ?? [];
          const risksStr = reqRisks.length
            ? "\n  Risk assessments: " + reqRisks.map((rk: any) => `${rk.category}=${rk.risk_level}${rk.summary ? ` (${rk.summary})` : ""}`).join("; ")
            : "";
          return `- ${r.request_code}: ${r.employee_name} [${r.status}] ${r.home_country}${r.home_city ? ` (${r.home_city})` : ""} → ${r.host_country}${r.host_city ? ` (${r.host_city})` : ""}, ${r.start_date}${r.end_date ? ` to ${r.end_date}` : " (indefinite)"}, type=${r.request_type}, duration=${r.duration_type}, risk=${r.overall_risk_level || "pending"}${r.purpose ? `, purpose: ${r.purpose}` : ""}${risksStr}`;
        }).join("\n");
      }

      contextBlock = `

## User's Current Data

### Policies (${policiesData.length})
${policiesData.length ? policiesData.map((p: any) => `- "${p.name}" (id=${p.id}) [${p.status}] tier=${p.tier}, tax=${p.tax_approach}${p.description ? `, desc: ${p.description}` : ""}`).join("\n") : "No policies found."}

### Simulations (${simulations.length})
${simulations.length ? simulations.map((s: any) => `- ${s.sim_code}: ${s.employee_name} [${s.status}] ${s.origin_country}→${s.destination_country}, ${s.assignment_type}, salary=${s.base_salary} ${s.currency}${s.total_cost ? `, total=${s.total_cost}` : ""}`).join("\n") : "No simulations found."}

### Calculations (${calculations.length})
${calculations.length ? calculations.map((c: any) => {
  const fields = calcFieldsByCalc[c.id] ?? [];
  const fieldsStr = fields.length
    ? "\n  Fields:\n" + fields.map((f: any) => `    - [field_id=${f.id}] "${f.label}" (name=${f.name}, type=${f.field_type}${f.default_value ? `, default=${f.default_value}` : ""}, pos=${f.position})`).join("\n")
    : "";
  return `- "${c.name}" (id=${c.id}) [${c.category || "uncategorized"}] formula=\`${c.formula}\`${c.description ? ` — ${c.description}` : ""}${fieldsStr}`;
}).join("\n") : "No calculations found."}

### Lookup Tables (${lookupTables.length})
${lookupTables.length ? lookupDetails : "No lookup tables found."}

### Remote Work Requests (${remoteWorkRequests.length})
${remoteWorkRequests.length ? rwRiskBlock : "No remote work requests found."}

### Pre-Travel Trips (${trips.length})
${trips.length ? tripSegmentsBlock : "No trips found."}
`;
    }

    const systemPrompt = `You are the AI assistant for a Global Mobility platform. You help HR and mobility professionals understand and manage:
- **Policies**: Assignment policies defining benefit packages, tiers, and tax approaches
- **Simulations**: Cost projections for international employee assignments
- **Calculations**: Benefit formulas (housing, COLA, tax equalization, etc.)
- **Tax**: Tax equalization, hypothetical tax, gross-up methods
- **Lookup Tables**: Reference data used in calculations (exchange rates, tax brackets, housing indices, COLA rates, etc.)
- **Remote Work**: Remote work requests and virtual assignments with risk assessments across immigration, tax, social security, and permanent establishment
- **Pre-Travel**: Business trip compliance assessments covering immigration, Schengen 90/180-day limits, and Posted Workers Directive (PWD)

You have access to the user's actual data including lookup table contents, remote work requests with risk assessments, and pre-travel trips with segments. When answering questions:
- About remote work: cite specific risk levels and assessment categories. Advise on immigration, tax, social security, and PE implications for specific country corridors.
- About pre-travel: reference trip segments, activity types, and compliance requirements for specific destinations.
- About locations: provide guidance on tax implications, visa requirements, social security treaties, and compliance risks for specific countries.

You have a tool called \`create_draft_simulation\` to create draft simulations. When the user wants to create a simulation:
1. Gather the required info conversationally: employee name, origin country, destination country, and assignment type.
2. Ask about optional details: salary, duration, city, department, policy, tax approach.
3. Once you have enough info (at least the 4 required fields), call the tool immediately.
4. If the user says something like "use defaults for the rest", go ahead and create with what you have.

You have a tool called \`create_remote_work_request\` to create remote work requests. When the user wants to initiate remote work:
1. Gather the required info: employee name, home country, host country, start date, and request type (employee_remote or virtual_assignment).
2. Ask about optional details: cities, end date, duration type, purpose, job title, department.
3. Once you have enough info, call the tool immediately.
4. Explain the risk categories that will be assessed: Immigration, Tax, Social Security, and Permanent Establishment.

You have a tool called \`create_trip\` to create pre-travel compliance trips. When the user wants to create a trip:
1. Gather the required info: traveler name and at least one segment (origin country, destination country, start date, end date).
2. Ask about optional details: citizenship, passport country, purpose, activity type.
3. Once you have enough info, call the tool immediately. You can create multi-segment itineraries.
4. Explain that assessments will run for Immigration, Schengen limits, and PWD.

You also have tools to manage lookup table data (admin only):
- \`add_lookup_table_row\`: Add a new row to a lookup table.
- \`update_lookup_table_row\`: Update an existing row.

You also have tools to manage calculations and their fields (admin only):
- \`update_calculation\`: Update a calculation's name, description, category, or formula.
- \`update_calculation_field\`: Update a calculation field's properties.

You also have tools to manage policies (admin only):
- \`create_policy\`: Create a new draft policy.
- \`update_policy\`: Update an existing policy.

When modifying data, confirm the action with the user before calling the tool. Each item in the context includes its id for reference.

When the user asks about a specific location or country corridor:
- Provide relevant tax treaty information, visa/work permit requirements, social security implications, and PE risk factors.
- Reference any existing remote work requests or trips for that corridor from the data.
- Suggest creating a request or trip if the user wants to proceed.

Be concise, professional, and helpful. Use bullet points and formatting for clarity.
${contextBlock}`;

    const aiHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };

    const allTools = [
      CREATE_SIMULATION_TOOL,
      ADD_LOOKUP_ROW_TOOL,
      UPDATE_LOOKUP_ROW_TOOL,
      UPDATE_CALCULATION_TOOL,
      UPDATE_CALCULATION_FIELD_TOOL,
      CREATE_POLICY_TOOL,
      UPDATE_POLICY_TOOL,
      CREATE_REMOTE_WORK_REQUEST_TOOL,
      CREATE_TRIP_TOOL,
    ];

    // Step 1: Non-streaming call with tools to check for tool usage
    const initialResponse = await fetch(AI_URL, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: allTools,
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
          const tenantId = requestTenantId || null;

          const insertData: any = {
            employee_name: args.employee_name,
            origin_country: args.origin_country,
            destination_country: args.destination_country,
            assignment_type: args.assignment_type,
            owner_id: user.id,
            tenant_id: tenantId,
            status: "draft",
          };

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
              content: JSON.stringify({ success: false, error: simError.message }),
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
        } else if (tc.function.name === "create_remote_work_request") {
          const args = JSON.parse(tc.function.arguments);
          const tenantId = requestTenantId || null;

          if (!tenantId) {
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({ success: false, error: "No active tenant. Please select a tenant first." }),
            });
            continue;
          }

          const insertData: any = {
            request_type: args.request_type,
            employee_name: String(args.employee_name).slice(0, 300),
            home_country: args.home_country,
            host_country: args.host_country,
            start_date: args.start_date,
            created_by: user.id,
            tenant_id: tenantId,
            status: "draft",
            duration_type: args.duration_type || "short_term",
          };

          if (args.employee_email) insertData.employee_email = args.employee_email;
          if (args.job_title) insertData.job_title = args.job_title;
          if (args.department) insertData.department = args.department;
          if (args.home_city) insertData.home_city = args.home_city;
          if (args.host_city) insertData.host_city = args.host_city;
          if (args.end_date) insertData.end_date = args.end_date;
          if (args.purpose) insertData.purpose = args.purpose;
          if (args.business_justification) insertData.business_justification = args.business_justification;
          if (args.notes) insertData.notes = args.notes;

          const { data: rw, error: rwError } = await supabase
            .from("remote_work_requests")
            .insert(insertData)
            .select("id, request_code, employee_name")
            .single();

          if (rwError) {
            console.error("Remote work insert error:", rwError);
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({ success: false, error: rwError.message }),
            });
          } else {
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({
                success: true,
                request_id: rw.id,
                request_code: rw.request_code,
                employee_name: rw.employee_name,
              }),
            });
          }
        } else if (tc.function.name === "create_trip") {
          const args = JSON.parse(tc.function.arguments);
          const tenantId = requestTenantId || null;

          if (!tenantId) {
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({ success: false, error: "No active tenant. Please select a tenant first." }),
            });
            continue;
          }

          if (!args.segments || !Array.isArray(args.segments) || args.segments.length === 0) {
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({ success: false, error: "At least one trip segment is required." }),
            });
            continue;
          }

          const tripData: any = {
            traveler_name: String(args.traveler_name).slice(0, 300),
            created_by: user.id,
            tenant_id: tenantId,
            status: "draft",
          };

          if (args.traveler_email) tripData.traveler_email = args.traveler_email;
          if (args.citizenship) tripData.citizenship = args.citizenship;
          if (args.passport_country) tripData.passport_country = args.passport_country;
          if (args.residency_country) tripData.residency_country = args.residency_country;
          if (args.purpose) tripData.purpose = args.purpose;
          if (args.notes) tripData.notes = args.notes;

          const { data: trip, error: tripError } = await supabase
            .from("trips")
            .insert(tripData)
            .select("id, trip_code, traveler_name")
            .single();

          if (tripError) {
            console.error("Trip insert error:", tripError);
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({ success: false, error: tripError.message }),
            });
            continue;
          }

          // Insert segments
          const segmentInserts = args.segments.map((seg: any, idx: number) => ({
            trip_id: trip.id,
            origin_country: seg.origin_country,
            origin_city: seg.origin_city || null,
            destination_country: seg.destination_country,
            destination_city: seg.destination_city || null,
            start_date: seg.start_date,
            end_date: seg.end_date,
            activity_type: seg.activity_type || "client_meeting",
            activity_description: seg.activity_description || null,
            segment_order: idx,
          }));

          const { error: segError } = await supabase
            .from("trip_segments")
            .insert(segmentInserts);

          if (segError) {
            console.error("Segment insert error:", segError);
            // Trip was created but segments failed
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({
                success: true,
                trip_id: trip.id,
                trip_code: trip.trip_code,
                traveler_name: trip.traveler_name,
                warning: "Trip created but some segments failed to save: " + segError.message,
              }),
            });
          } else {
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({
                success: true,
                trip_id: trip.id,
                trip_code: trip.trip_code,
                traveler_name: trip.traveler_name,
                segments_count: segmentInserts.length,
              }),
            });
          }
        } else if (tc.function.name === "add_lookup_table_row" || tc.function.name === "update_lookup_table_row" || tc.function.name === "update_calculation" || tc.function.name === "update_calculation_field" || tc.function.name === "create_policy" || tc.function.name === "update_policy") {
          // Admin-level check
          const { data: userRoles, error: roleErr } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

          const roles = (userRoles ?? []).map((r: any) => r.role as string);
          const isAdmin = roles.includes("admin") || roles.includes("superadmin");

          if (roleErr || !isAdmin) {
            toolResults.push({
              tool_call_id: tc.id,
              role: "tool",
              content: JSON.stringify({
                success: false,
                error: "Permission denied. Only admin-level users can modify data via chat.",
              }),
            });
            continue;
          }

          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const adminClient = createClient(supabaseUrl, serviceRoleKey);

          if (tc.function.name === "add_lookup_table_row") {
            const args = JSON.parse(tc.function.arguments);
            if (!args.row_data || typeof args.row_data !== "object" || Array.isArray(args.row_data)) {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: false, error: "row_data must be a JSON object" }) });
              continue;
            }
            const sanitized: Record<string, any> = {};
            for (const [k, v] of Object.entries(args.row_data)) {
              const key = String(k).slice(0, 100);
              sanitized[key] = typeof v === "string" ? v.slice(0, 500) : v;
            }
            const { data: lastRow } = await adminClient
              .from("lookup_table_rows").select("row_order").eq("lookup_table_id", args.lookup_table_id)
              .order("row_order", { ascending: false }).limit(1).single();
            const nextOrder = (lastRow?.row_order ?? -1) + 1;
            const { data: newRow, error: rowError } = await adminClient
              .from("lookup_table_rows").insert({ lookup_table_id: args.lookup_table_id, row_data: sanitized, row_order: nextOrder })
              .select("id").single();
            if (rowError) {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: false, error: rowError.message }) });
            } else {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: true, row_id: newRow.id, row_data: sanitized }) });
            }

          } else if (tc.function.name === "update_lookup_table_row") {
            const args = JSON.parse(tc.function.arguments);
            if (!args.row_data || typeof args.row_data !== "object" || Array.isArray(args.row_data)) {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: false, error: "row_data must be a JSON object" }) });
              continue;
            }
            const { data: existingRow, error: fetchErr } = await adminClient
              .from("lookup_table_rows").select("row_data").eq("id", args.row_id).single();
            if (fetchErr || !existingRow) {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: false, error: fetchErr?.message || "Row not found" }) });
              continue;
            }
            const existingData = (existingRow.row_data as Record<string, any>) || {};
            const mergedData: Record<string, any> = { ...existingData };
            for (const [k, v] of Object.entries(args.row_data)) {
              const key = String(k).slice(0, 100);
              mergedData[key] = typeof v === "string" ? v.slice(0, 500) : v;
            }
            const { error: updateErr } = await adminClient.from("lookup_table_rows").update({ row_data: mergedData }).eq("id", args.row_id);
            if (updateErr) {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: false, error: updateErr.message }) });
            } else {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: true, row_id: args.row_id, updated_data: mergedData }) });
            }

          } else if (tc.function.name === "update_calculation") {
            const args = JSON.parse(tc.function.arguments);
            const updateData: Record<string, any> = {};
            if (args.name) updateData.name = String(args.name).slice(0, 200);
            if (args.description !== undefined) updateData.description = args.description ? String(args.description).slice(0, 1000) : null;
            if (args.category !== undefined) updateData.category = args.category ? String(args.category).slice(0, 100) : null;
            if (args.formula) updateData.formula = String(args.formula).slice(0, 5000);
            if (Object.keys(updateData).length === 0) {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: false, error: "No fields to update." }) });
              continue;
            }
            const { error: calcErr } = await adminClient.from("calculations").update(updateData).eq("id", args.calculation_id);
            if (calcErr) {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: false, error: calcErr.message }) });
            } else {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: true, calculation_id: args.calculation_id, updated_fields: updateData }) });
            }

          } else if (tc.function.name === "update_calculation_field") {
            const args = JSON.parse(tc.function.arguments);
            const updateData: Record<string, any> = {};
            if (args.label) updateData.label = String(args.label).slice(0, 200);
            if (args.name) updateData.name = String(args.name).slice(0, 200);
            if (args.field_type) updateData.field_type = String(args.field_type).slice(0, 50);
            if (args.default_value !== undefined) updateData.default_value = args.default_value !== null ? String(args.default_value).slice(0, 500) : null;
            if (args.position !== undefined) updateData.position = Number(args.position);
            if (Object.keys(updateData).length === 0) {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: false, error: "No fields to update." }) });
              continue;
            }
            const { error: fieldErr } = await adminClient.from("calculation_fields").update(updateData).eq("id", args.field_id);
            if (fieldErr) {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: false, error: fieldErr.message }) });
            } else {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: true, field_id: args.field_id, updated_fields: updateData }) });
            }

          } else if (tc.function.name === "create_policy") {
            const args = JSON.parse(tc.function.arguments);
            const tenantId = requestTenantId || null;
            const policyData: Record<string, any> = {
              name: String(args.name).slice(0, 300),
              created_by: user.id,
              tenant_id: tenantId,
              status: "draft",
              tier: args.tier || "custom",
              tax_approach: args.tax_approach || "tax-equalization",
            };
            if (args.description) policyData.description = String(args.description).slice(0, 2000);
            if (args.benefit_components && Array.isArray(args.benefit_components)) {
              policyData.benefit_components = args.benefit_components.slice(0, 50).map((c: any) => ({
                name: String(c.name || "").slice(0, 200),
                type: String(c.type || "Allowance").slice(0, 100),
                taxable: String(c.taxable || "N/A").slice(0, 50),
                calcMethod: String(c.calcMethod || "").slice(0, 500),
                amount: String(c.amount || "").slice(0, 100),
              }));
            }
            const { data: newPolicy, error: policyErr } = await adminClient
              .from("policies").insert(policyData).select("id, name, status, tier").single();
            if (policyErr) {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: false, error: policyErr.message }) });
            } else {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: true, policy_id: newPolicy.id, policy_name: newPolicy.name, status: newPolicy.status, tier: newPolicy.tier }) });
            }

          } else if (tc.function.name === "update_policy") {
            const args = JSON.parse(tc.function.arguments);
            const updateData: Record<string, any> = {};
            if (args.name) updateData.name = String(args.name).slice(0, 300);
            if (args.description !== undefined) updateData.description = args.description ? String(args.description).slice(0, 2000) : null;
            if (args.tier) updateData.tier = String(args.tier).slice(0, 50);
            if (args.tax_approach) updateData.tax_approach = String(args.tax_approach).slice(0, 50);
            if (args.status) updateData.status = String(args.status).slice(0, 20);
            if (args.benefit_components && Array.isArray(args.benefit_components)) {
              updateData.benefit_components = args.benefit_components.slice(0, 50).map((c: any) => ({
                name: String(c.name || "").slice(0, 200),
                type: String(c.type || "Allowance").slice(0, 100),
                taxable: String(c.taxable || "N/A").slice(0, 50),
                calcMethod: String(c.calcMethod || "").slice(0, 500),
                amount: String(c.amount || "").slice(0, 100),
                calculationId: c.calculationId || null,
              }));
            }
            if (Object.keys(updateData).length === 0) {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: false, error: "No fields to update." }) });
              continue;
            }
            const { error: polErr } = await adminClient.from("policies").update(updateData).eq("id", args.policy_id);
            if (polErr) {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: false, error: polErr.message }) });
            } else {
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: JSON.stringify({ success: true, policy_id: args.policy_id, updated_fields: updateData }) });
            }
          }
        }
      }

      // Step 3: Stream the follow-up response with tool results
      const followUpMessages = [
        { role: "system", content: systemPrompt },
        ...messages,
        choice.message,
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

      // Prepend custom events for each created entity
      const customEvents: string[] = [];
      for (const tr of toolResults) {
        const parsed = JSON.parse(tr.content);
        if (parsed.success && parsed.simulation_id) {
          customEvents.push(
            `event: simulation_created\ndata: ${JSON.stringify({
              id: parsed.simulation_id,
              sim_code: parsed.sim_code,
              employee_name: parsed.employee_name,
            })}\n\n`
          );
        }
        if (parsed.success && parsed.policy_id && parsed.policy_name) {
          customEvents.push(
            `event: policy_created\ndata: ${JSON.stringify({
              id: parsed.policy_id,
              name: parsed.policy_name,
              status: parsed.status || "draft",
              tier: parsed.tier || "custom",
            })}\n\n`
          );
        }
        if (parsed.success && parsed.request_id) {
          customEvents.push(
            `event: remote_work_created\ndata: ${JSON.stringify({
              id: parsed.request_id,
              request_code: parsed.request_code,
              employee_name: parsed.employee_name,
            })}\n\n`
          );
        }
        if (parsed.success && parsed.trip_id) {
          customEvents.push(
            `event: trip_created\ndata: ${JSON.stringify({
              id: parsed.trip_id,
              trip_code: parsed.trip_code,
              traveler_name: parsed.traveler_name,
            })}\n\n`
          );
        }
      }

      const encoder = new TextEncoder();
      const prefixBytes = encoder.encode(customEvents.join(""));

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

    // No tool calls — return as SSE
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
