import { ParsedScreenshotResult } from "@/lib/types";

interface OpenAiParsePayload {
  screenshotId: string;
  imageUrl: string;
  forcedGpName?: string;
}

interface OpenAiResponse {
  output_text?: string;
}

function normalizeParsedResult(raw: unknown, screenshotId: string): ParsedScreenshotResult {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: `parse_${screenshotId}`,
    screenshotId,
    gpName: typeof value.gp_name === "string" ? value.gp_name : undefined,
    detectedAccountName: typeof value.detected_account_name === "string" ? value.detected_account_name : undefined,
    detectedTeamNames: Array.isArray(value.detected_team_names)
      ? value.detected_team_names.filter((item): item is string => typeof item === "string")
      : [],
    detectedScores: Array.isArray(value.detected_scores)
      ? value.detected_scores.map((item) => Number(item)).filter((n) => Number.isFinite(n))
      : [],
    screenshotType: typeof value.screenshot_type === "string" ? value.screenshot_type : undefined,
    parsedEntities:
      value.parsed_entities && typeof value.parsed_entities === "object"
        ? (value.parsed_entities as Record<string, string | number | null>)
        : {},
    confidenceByField:
      value.confidence_by_field && typeof value.confidence_by_field === "object"
        ? (value.confidence_by_field as Record<string, number>)
        : {},
    missingFields: Array.isArray(value.missing_fields)
      ? value.missing_fields.filter((item): item is string => typeof item === "string")
      : [],
    warnings: Array.isArray(value.warnings) ? value.warnings.filter((item): item is string => typeof item === "string") : [],
    approved: false
  };
}

export async function openAIVisionParse(payload: OpenAiParsePayload): Promise<ParsedScreenshotResult> {
  const apiKey = process.env.VISION_API_KEY;
  const model = process.env.VISION_MODEL || "gpt-4.1-mini";
  const baseUrl = process.env.VISION_API_BASE_URL || "https://api.openai.com/v1";

  if (!apiKey) {
    throw new Error("VISION_API_KEY is missing.");
  }

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Extract structured F1 fantasy screenshot data as JSON with keys: gp_name, detected_account_name, detected_team_names, detected_scores, screenshot_type, parsed_entities, confidence_by_field, missing_fields, warnings. Return JSON only."
            },
            {
              type: "input_image",
              image_url: payload.imageUrl
            },
            {
              type: "input_text",
              text: payload.forcedGpName ? `Expected GP: ${payload.forcedGpName}` : "No expected GP provided."
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Vision API request failed: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as OpenAiResponse;
  const output = data.output_text;
  if (!output) {
    throw new Error("Vision API returned empty output_text.");
  }

  const jsonStart = output.indexOf("{");
  const jsonEnd = output.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Vision API response did not contain a JSON object.");
  }

  const parsed = JSON.parse(output.slice(jsonStart, jsonEnd + 1));
  return normalizeParsedResult(parsed, payload.screenshotId);
}
