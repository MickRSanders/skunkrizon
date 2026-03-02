import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FilterCriteria {
  key: string;
  value: string;
  operationType: "EQ" | "IN";
}

interface RateEntry {
  id: string;
  customer_code: string | null;
  status: string;
  valid_from: string | null;
  valid_to: string | null;
  origin_location_id: string | null;
  origin_location_type: string | null;
  destination_location_id: string | null;
  destination_location_type: string | null;
  location_id: string | null;
  location_type: string | null;
  amount: number | null;
  currency: string | null;
  time_span: string | null;
  percentage: number | null;
  dimensions: Record<string, any>;
  scope_option_code: string | null;
  scope_group: string | null;
  not_required: boolean;
  frequency: string | null;
  source_profile_item: string | null;
  source_currency_profile_item: string | null;
}

// Location hierarchy for fallback matching
const LOCATION_HIERARCHY = ["CITY", "STATE", "COUNTRY", "CONTINENT", "WORLD"];

/**
 * Wildcard matching algorithm:
 * 1. Find all entries matching the criteria (with NULLs acting as wildcards)
 * 2. Score them by specificity (fewer NULLs = higher score)
 * 3. Prefer customer-specific rates over standard (null customer_code) rates
 * 4. Return the best match(es)
 */
function scoreEntry(entry: RateEntry, filters: FilterCriteria[]): number {
  let score = 0;

  // Customer code bonus: customer-specific rates rank higher
  if (entry.customer_code !== null) {
    score += 1000;
  }

  // Standard field matches
  const standardFields = [
    "location_id", "location_type",
    "origin_location_id", "origin_location_type",
    "destination_location_id", "destination_location_type",
  ];

  for (const field of standardFields) {
    const val = (entry as any)[field];
    if (val !== null && val !== undefined) {
      score += 10; // Non-null field = more specific
    }
  }

  // Dimension matches
  for (const [key, val] of Object.entries(entry.dimensions || {})) {
    if (val !== null && val !== undefined) {
      score += 5; // Non-null dimension = more specific
    }
  }

  return score;
}

function entryMatchesFilters(entry: RateEntry, filters: FilterCriteria[], effectiveDate?: string): boolean {
  for (const filter of filters) {
    const key = filter.key;
    const value = filter.value;

    // Check standard fields first
    const standardFieldMap: Record<string, keyof RateEntry> = {
      locationUuid: "location_id",
      locationId: "location_id",
      location_id: "location_id",
      locationType: "location_type",
      location_type: "location_type",
      originLocationUuid: "origin_location_id",
      origin_location_id: "origin_location_id",
      originLocationType: "origin_location_type",
      origin_location_type: "origin_location_type",
      destinationLocationUuid: "destination_location_id",
      destination_location_id: "destination_location_id",
      destinationLocationType: "destination_location_type",
      destination_location_type: "destination_location_type",
      customerCode: "customer_code",
      customer_code: "customer_code",
      status: "status",
      timeSpan: "time_span",
      time_span: "time_span",
      frequency: "frequency",
    };

    const mappedField = standardFieldMap[key];
    if (mappedField) {
      const entryVal = (entry as any)[mappedField];
      // Wildcard: null matches anything
      if (entryVal === null || entryVal === undefined) continue;
      if (String(entryVal) !== String(value)) return false;
    } else {
      // Check dimensions
      const dimVal = entry.dimensions?.[key];
      // Wildcard: null/undefined matches anything
      if (dimVal === null || dimVal === undefined) continue;
      if (String(dimVal) !== String(value)) return false;
    }
  }

  // Effective date check
  if (effectiveDate) {
    const d = new Date(effectiveDate);
    if (entry.valid_from && new Date(entry.valid_from) > d) return false;
    if (entry.valid_to && new Date(entry.valid_to) < d) return false;
  }

  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      rate_table_id,
      rate_table_name,
      tenant_id,
      customer_code,
      filters = [],
      effective_date,
      limit = 10,
    } = body as {
      rate_table_id?: string;
      rate_table_name?: string;
      tenant_id: string;
      customer_code?: string;
      filters: FilterCriteria[];
      effective_date?: string;
      limit?: number;
    };

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the rate table
    let tableId = rate_table_id;
    if (!tableId && rate_table_name) {
      const { data: tables } = await supabase
        .from("rate_tables")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("name", rate_table_name)
        .eq("status", "active")
        .limit(1);
      if (tables && tables.length > 0) {
        tableId = tables[0].id;
      }
    }

    if (!tableId) {
      return new Response(JSON.stringify({ error: "Rate table not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all active entries for this table
    let query = supabase
      .from("rate_table_entries")
      .select("*")
      .eq("rate_table_id", tableId)
      .eq("status", "ACTIVE");

    const { data: allEntries, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    const entries = (allEntries || []) as RateEntry[];

    // Step 1: Filter entries (with wildcard support)
    const matching = entries.filter((e) => entryMatchesFilters(e, filters, effective_date));

    // Step 2: Separate customer-specific and standard entries
    const customerEntries = customer_code
      ? matching.filter((e) => e.customer_code === customer_code)
      : [];
    const standardEntries = matching.filter((e) => e.customer_code === null);

    // Step 3: Score and sort
    const scoredCustomer = customerEntries
      .map((e) => ({ entry: e, score: scoreEntry(e, filters) }))
      .sort((a, b) => b.score - a.score);

    const scoredStandard = standardEntries
      .map((e) => ({ entry: e, score: scoreEntry(e, filters) }))
      .sort((a, b) => b.score - a.score);

    // Step 4: Prefer customer rates, fall back to standard
    const results = scoredCustomer.length > 0
      ? scoredCustomer.slice(0, limit).map((s) => s.entry)
      : scoredStandard.slice(0, limit).map((s) => s.entry);

    return new Response(
      JSON.stringify({
        content: results,
        total_matches: matching.length,
        customer_matches: customerEntries.length,
        standard_matches: standardEntries.length,
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
