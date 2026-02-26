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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) throw new Error("Invalid token");

    const { trip_id } = await req.json();
    if (!trip_id) throw new Error("trip_id required");

    // Fetch trip
    const { data: trip, error: tripErr } = await adminClient
      .from("trips")
      .select("*")
      .eq("id", trip_id)
      .single();
    if (tripErr || !trip) throw new Error("Trip not found");

    // Fetch segments
    const { data: segments } = await adminClient
      .from("trip_segments")
      .select("*")
      .eq("trip_id", trip_id)
      .order("segment_order");

    if (!segments || segments.length === 0) {
      throw new Error("No segments to assess");
    }

    // Fetch tenant config
    const { data: config } = await adminClient
      .from("pta_module_config")
      .select("*")
      .eq("tenant_id", trip.tenant_id)
      .maybeSingle();

    const enabledModules: string[] = [];
    if (!config || config.immigration_enabled) enabledModules.push("immigration");
    if (!config || config.schengen_enabled) enabledModules.push("schengen");
    if (!config || config.pwd_enabled) enabledModules.push("pwd");
    if (config?.social_security_enabled) enabledModules.push("social_security");
    if (config?.withholding_enabled) enabledModules.push("withholding");
    if (config?.pe_enabled) enabledModules.push("pe");

    // Delete previous assessments for this trip
    await adminClient.from("trip_assessments").delete().eq("trip_id", trip_id);

    const assessments: any[] = [];

    for (const segment of segments) {
      for (const module of enabledModules) {
        const result = evaluateModule(module, trip, segment, config);

        assessments.push({
          trip_id,
          segment_id: segment.id,
          module,
          outcome: result.outcome,
          statutory_outcome: result.statutory_outcome,
          reasoning: result.reasoning,
          rule_references: result.rule_references,
          raw_api_response: result.raw_api_response,
          risk_level: result.risk_level,
          risk_flags: result.risk_flags,
          next_steps: result.next_steps,
          assessed_at: new Date().toISOString(),
          assessed_by: "system",
        });
      }
    }

    // Insert assessments
    const { error: insertErr } = await adminClient
      .from("trip_assessments")
      .insert(assessments);
    if (insertErr) throw new Error(insertErr.message);

    // Update trip status
    await adminClient
      .from("trips")
      .update({ status: "assessed" })
      .eq("id", trip_id);

    return new Response(
      JSON.stringify({ success: true, assessments_count: assessments.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("run-assessment error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================
// MOCK RULES ENGINE — Replace with Permiso / Monaeo API calls
// ============================================================

interface EvalResult {
  outcome: string;
  statutory_outcome: string;
  reasoning: string;
  rule_references: any[];
  raw_api_response: Record<string, any>;
  risk_level: string;
  risk_flags: any[];
  next_steps: string;
}

function evaluateModule(
  module: string,
  trip: any,
  segment: any,
  config: any
): EvalResult {
  switch (module) {
    case "immigration":
      return evaluateImmigration(trip, segment);
    case "schengen":
      return evaluateSchengen(trip, segment);
    case "pwd":
      return evaluatePWD(trip, segment);
    default:
      return {
        outcome: "pending",
        statutory_outcome: "not_evaluated",
        reasoning: `${module} assessment requires external API integration (Phase 2).`,
        rule_references: [],
        raw_api_response: { note: "Placeholder — connect external provider" },
        risk_level: "low",
        risk_flags: [],
        next_steps: "Configure external API integration for this module.",
      };
  }
}

// --- IMMIGRATION (mock Permiso) ---
function evaluateImmigration(trip: any, segment: any): EvalResult {
  const dest = (segment.destination_country || "").toLowerCase();
  const passport = (trip.passport_country || "").toLowerCase();
  const days = segment.duration_days || (segment.end_date && segment.start_date
    ? Math.ceil((new Date(segment.end_date).getTime() - new Date(segment.start_date).getTime()) / 86400000)
    : 0);
  const activity = segment.activity_type || "business_meeting";

  // Simple heuristic rules (to be replaced by Permiso API)
  const sameCountry = dest === passport;
  const isShortBusiness = ["business_meeting", "conference", "training"].includes(activity) && days <= 90;
  const isWorkActivity = ["project_work", "installation", "management"].includes(activity);

  if (sameCountry) {
    return {
      outcome: "green",
      statutory_outcome: "free_travel",
      reasoning: "Traveler's passport country matches destination. No immigration action required.",
      rule_references: [{ rule_id: "IMM-001", description: "Domestic travel exemption" }],
      raw_api_response: { provider: "mock_permiso", matched_rule: "domestic_exemption" },
      risk_level: "low",
      risk_flags: [],
      next_steps: "No action required.",
    };
  }

  if (isShortBusiness) {
    return {
      outcome: "green",
      statutory_outcome: "visa_waiver",
      reasoning: `Short-term business activity (${days} days, ${activity.replace(/_/g, " ")}) typically covered under visa waiver for ${dest}.`,
      rule_references: [{ rule_id: "IMM-002", description: "Business visitor visa waiver" }],
      raw_api_response: { provider: "mock_permiso", matched_rule: "business_visitor_waiver", days, activity },
      risk_level: "low",
      risk_flags: [],
      next_steps: "Verify traveler has valid passport with 6+ months validity.",
    };
  }

  if (isWorkActivity && days > 30) {
    return {
      outcome: "red",
      statutory_outcome: "work_permit_required",
      reasoning: `Work activity (${activity.replace(/_/g, " ")}) exceeding 30 days in ${dest} requires a work permit.`,
      rule_references: [{ rule_id: "IMM-003", description: "Work permit threshold" }],
      raw_api_response: { provider: "mock_permiso", matched_rule: "work_permit_required", days, activity },
      risk_level: "high",
      risk_flags: [{ flag: "work_permit_required", severity: "high" }],
      next_steps: "Initiate work permit application. Contact immigration counsel.",
    };
  }

  return {
    outcome: "amber",
    statutory_outcome: "visa_required",
    reasoning: `Trip to ${dest} for ${days} days may require a visa depending on bilateral agreements.`,
    rule_references: [{ rule_id: "IMM-004", description: "General visa requirement check" }],
    raw_api_response: { provider: "mock_permiso", matched_rule: "visa_check", days },
    risk_level: "medium",
    risk_flags: [{ flag: "visa_check_needed", severity: "medium" }],
    next_steps: "Review visa requirements for this passport/destination combination.",
  };
}

// --- SCHENGEN (Phase 1: current trip only) ---
function evaluateSchengen(trip: any, segment: any): EvalResult {
  const schengenCountries = [
    "austria", "belgium", "croatia", "czech republic", "denmark", "estonia",
    "finland", "france", "germany", "greece", "hungary", "iceland", "italy",
    "latvia", "liechtenstein", "lithuania", "luxembourg", "malta", "netherlands",
    "norway", "poland", "portugal", "romania", "slovakia", "slovenia", "spain",
    "sweden", "switzerland",
  ];

  const dest = (segment.destination_country || "").toLowerCase();
  const passport = (trip.passport_country || "").toLowerCase();
  const days = segment.duration_days || 0;

  if (!schengenCountries.includes(dest)) {
    return {
      outcome: "green",
      statutory_outcome: "not_applicable",
      reasoning: `${segment.destination_country} is not a Schengen area country. No Schengen evaluation needed.`,
      rule_references: [],
      raw_api_response: { provider: "mock_schengen", applicable: false },
      risk_level: "low",
      risk_flags: [],
      next_steps: "No Schengen action required.",
    };
  }

  // EU/Schengen passport holder
  if (schengenCountries.includes(passport)) {
    return {
      outcome: "green",
      statutory_outcome: "free_movement",
      reasoning: "Traveler holds a Schengen-area passport. Free movement applies.",
      rule_references: [{ rule_id: "SCH-001", description: "EU/Schengen free movement" }],
      raw_api_response: { provider: "mock_schengen", free_movement: true },
      risk_level: "low",
      risk_flags: [],
      next_steps: "No Schengen action required.",
    };
  }

  if (days > 90) {
    return {
      outcome: "red",
      statutory_outcome: "90_day_limit_exceeded",
      reasoning: `Trip duration (${days} days) exceeds the 90-day Schengen limit within a 180-day rolling period.`,
      rule_references: [{ rule_id: "SCH-002", description: "90/180-day rule" }],
      raw_api_response: { provider: "mock_schengen", days_in_period: days, limit: 90 },
      risk_level: "critical",
      risk_flags: [{ flag: "schengen_overstay", severity: "critical" }],
      next_steps: "Reduce trip duration or apply for a national visa. Consult immigration counsel.",
    };
  }

  if (days > 60) {
    return {
      outcome: "amber",
      statutory_outcome: "approaching_limit",
      reasoning: `Trip duration (${days} days) is approaching the 90-day Schengen limit. Consider cumulative exposure.`,
      rule_references: [{ rule_id: "SCH-003", description: "Approaching 90/180 threshold" }],
      raw_api_response: { provider: "mock_schengen", days_in_period: days, limit: 90 },
      risk_level: "medium",
      risk_flags: [{ flag: "schengen_approaching_limit", severity: "medium" }],
      next_steps: "Monitor cumulative Schengen days. Phase 2 will provide rolling 90/180 tracking via Monaeo.",
    };
  }

  return {
    outcome: "green",
    statutory_outcome: "within_limit",
    reasoning: `Trip duration (${days} days) is within the 90-day Schengen limit.`,
    rule_references: [{ rule_id: "SCH-004", description: "Within 90/180 limit" }],
    raw_api_response: { provider: "mock_schengen", days_in_period: days, limit: 90 },
    risk_level: "low",
    risk_flags: [],
    next_steps: "No action required, but track cumulative Schengen exposure.",
  };
}

// --- PWD (Posted Workers Directive) ---
function evaluatePWD(trip: any, segment: any): EvalResult {
  const euCountries = [
    "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech republic",
    "denmark", "estonia", "finland", "france", "germany", "greece", "hungary",
    "ireland", "italy", "latvia", "lithuania", "luxembourg", "malta",
    "netherlands", "poland", "portugal", "romania", "slovakia", "slovenia",
    "spain", "sweden",
  ];

  const dest = (segment.destination_country || "").toLowerCase();
  const activity = segment.activity_type || "";
  const days = segment.duration_days || 0;

  if (!euCountries.includes(dest)) {
    return {
      outcome: "green",
      statutory_outcome: "not_applicable",
      reasoning: `${segment.destination_country} is outside the EU. Posted Workers Directive does not apply.`,
      rule_references: [],
      raw_api_response: { provider: "mock_pwd", applicable: false },
      risk_level: "low",
      risk_flags: [],
      next_steps: "No PWD action required.",
    };
  }

  const isPostingActivity = ["project_work", "installation", "management"].includes(activity);

  if (!isPostingActivity) {
    return {
      outcome: "green",
      statutory_outcome: "not_a_posting",
      reasoning: `Activity type "${activity.replace(/_/g, " ")}" does not constitute a posting under PWD.`,
      rule_references: [{ rule_id: "PWD-001", description: "Activity type exemption" }],
      raw_api_response: { provider: "mock_pwd", is_posting: false, activity },
      risk_level: "low",
      risk_flags: [],
      next_steps: "No PWD action required for this activity type.",
    };
  }

  if (days > 30) {
    return {
      outcome: "red",
      statutory_outcome: "pwd_notification_required",
      reasoning: `Posting activity (${activity.replace(/_/g, " ")}) in ${dest} for ${days} days triggers PWD notification obligations.`,
      rule_references: [{ rule_id: "PWD-002", description: "PWD notification threshold" }],
      raw_api_response: { provider: "mock_pwd", notification_required: true, days },
      risk_level: "high",
      risk_flags: [{ flag: "pwd_notification", severity: "high" }],
      next_steps: "File PWD notification with the host country authority. Ensure local terms & conditions compliance.",
    };
  }

  return {
    outcome: "amber",
    statutory_outcome: "pwd_may_apply",
    reasoning: `Posting activity in an EU country (${dest}). Duration (${days} days) is short but PWD may still apply depending on jurisdiction.`,
    rule_references: [{ rule_id: "PWD-003", description: "Short-term posting assessment" }],
    raw_api_response: { provider: "mock_pwd", days, may_apply: true },
    risk_level: "medium",
    risk_flags: [{ flag: "pwd_review_needed", severity: "medium" }],
    next_steps: "Review country-specific PWD thresholds. Some EU countries require notification from day 1.",
  };
}
