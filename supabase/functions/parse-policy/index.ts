import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_DOCUMENT_LENGTH = 50000;
const MAX_FILENAME_LENGTH = 255;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentText, fileName } = await req.json();

    if (!documentText || typeof documentText !== "string") {
      return new Response(JSON.stringify({ error: "documentText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation: length limit
    if (documentText.length > MAX_DOCUMENT_LENGTH) {
      return new Response(JSON.stringify({ error: `Document too large. Maximum ${MAX_DOCUMENT_LENGTH} characters allowed.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation: filename sanitization
    if (fileName && (typeof fileName !== "string" || fileName.includes("..") || fileName.length > MAX_FILENAME_LENGTH)) {
      return new Response(JSON.stringify({ error: "Invalid filename" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitizedFileName = fileName
      ? fileName.replace(/[^\w\s.\-()]/g, "").slice(0, MAX_FILENAME_LENGTH)
      : "document";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a relocation policy document parser for Cartus Horizon. 
Extract structured data from the uploaded policy document text. Return a JSON object with these fields:

{
  "policyName": "string - the full policy name",
  "tier": "string - gold/silver/bronze/custom",
  "description": "string - brief summary of the policy (1-2 sentences)",
  "taxApproach": "string - tax-equalization/tax-protection/actual-tax",
  "benefitComponents": [
    {
      "name": "string - component name",
      "type": "string - Allowance/Benefit/One-time/Tax",
      "taxable": "string - Host only/Both/Non-taxable/N/A",
      "calcMethod": "string - how it's calculated",
      "amount": "string - amount or limit"
    }
  ],
  "eligibility": "string - who qualifies for this policy",
  "duration": "string - typical assignment duration",
  "notes": "string - any additional important notes"
}

If a field cannot be determined from the document, use null. Always return valid JSON only, no markdown fences.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse this policy document (filename: ${sanitizedFileName}):\n\n${documentText.slice(0, 15000)}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to process document" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw: content, parseError: true };
    }

    return new Response(JSON.stringify({ parsed, rawResponse: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-policy error:", e);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
