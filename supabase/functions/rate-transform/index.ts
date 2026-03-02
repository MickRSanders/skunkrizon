import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { rows, instructions, columns } = await req.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "No data rows provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!instructions || typeof instructions !== "string" || !instructions.trim()) {
      // No transform needed — return rows as-is
      return new Response(JSON.stringify({ transformed: rows }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build a sample of the data (first 5 rows) for context
    const sampleRows = rows.slice(0, 5);
    const columnList = columns?.length ? columns.join(", ") : Object.keys(rows[0]).join(", ");

    const systemPrompt = `You are a data transformation engine for rate tables. You receive tabular data rows as JSON arrays and must apply transformation logic described in natural language.

Rules:
- Return ONLY the transformed rows as a valid JSON array — no markdown, no explanation, no wrapping.
- Each row is a JSON object. Preserve the object structure and keys unless the instruction explicitly says to rename/add/remove columns.
- Apply the transformation to ALL rows, not just the sample.
- If the instruction is ambiguous, make a reasonable interpretation and apply it consistently.
- Numeric values should remain numbers (not strings).
- If a transformation cannot be applied to a row (e.g., division by zero), keep the original value.
- NEVER return anything other than a JSON array of objects.`;

    const userPrompt = `Here is the data (${rows.length} total rows). Columns: ${columnList}

Sample (first ${sampleRows.length} rows):
${JSON.stringify(sampleRows, null, 2)}

Full data (all ${rows.length} rows):
${JSON.stringify(rows)}

Transformation instructions:
"${instructions}"

Apply the transformation to ALL rows and return the complete transformed dataset as a JSON array.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    // Parse the JSON array from the response
    // Strip markdown code fences if present
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    let transformed: any[];
    try {
      transformed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", cleaned.substring(0, 500));
      return new Response(JSON.stringify({ error: "AI returned invalid data. Try simpler instructions." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(transformed)) {
      return new Response(JSON.stringify({ error: "AI returned non-array data. Try rephrasing." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ transformed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rate-transform error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
