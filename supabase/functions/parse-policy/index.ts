import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILENAME_LENGTH = 255;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { filePath, fileName, documentText } = await req.json();

    // Support both new (filePath) and legacy (documentText) modes
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate filename
    const sanitizedFileName = fileName
      ? String(fileName).replace(/[^\w\s.\-()]/g, "").slice(0, MAX_FILENAME_LENGTH)
      : "document";

    const systemPrompt = `You are a relocation policy document parser for Cartus Horizon. 
Extract structured data from the uploaded policy document. Return a JSON object with these fields:

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

    let messages: any[];

    if (filePath) {
      // New mode: download file from storage and send as base64
      const authHeader = req.headers.get("authorization") || "";
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: fileData, error: downloadErr } = await adminClient.storage
        .from("policy-documents")
        .download(filePath);

      if (downloadErr || !fileData) {
        console.error("Storage download error:", downloadErr);
        return new Response(JSON.stringify({ error: "Failed to download document from storage" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const b64 = base64Encode(uint8);

      // Determine MIME type from filename
      const ext = (fileName || filePath || "").toLowerCase().split(".").pop();
      let mimeType = "application/pdf";
      if (ext === "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else if (ext === "txt" || ext === "csv") mimeType = "text/plain";

      if (mimeType === "text/plain") {
        // For text files, just send as text
        const textContent = new TextDecoder().decode(uint8);
        messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse this policy document (filename: ${sanitizedFileName}):\n\n${textContent.slice(0, 50000)}` },
        ];
      } else {
        // For PDF/DOCX, send as inline_data (Gemini supports this)
        messages = [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Parse this policy document (filename: ${sanitizedFileName}).` },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${b64}`,
                },
              },
            ],
          },
        ];
      }
    } else if (documentText && typeof documentText === "string") {
      // Legacy text mode
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this policy document (filename: ${sanitizedFileName}):\n\n${documentText.slice(0, 15000)}` },
      ];
    } else {
      return new Response(JSON.stringify({ error: "filePath or documentText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
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
