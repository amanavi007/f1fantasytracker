import { ParsedScreenshotResult } from "@/lib/types";

interface OpenAiParsePayload {
  screenshotId: string;
  imageUrl: string;
  forcedGpName?: string;
}

interface OpenAiResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
}

interface VisionParseRequest {
  model: string;
  apiKey: string;
  baseUrl: string;
  imageUrl: string;
  prompt: string;
  expectedGp?: string;
}

function extractOutputText(data: OpenAiResponse) {
  if (typeof data.output_text === "string" && data.output_text.trim().length > 0) {
    return data.output_text;
  }

  const chunks: string[] = [];
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if ((content.type === "output_text" || content.type === "text") && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

async function runVisionRequest(req: VisionParseRequest) {
  const response = await fetch(`${req.baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.apiKey}`
    },
    body: JSON.stringify({
      model: req.model,
      text: {
        format: {
          type: "json_object"
        }
      },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: req.prompt
            },
            {
              type: "input_image",
              image_url: req.imageUrl
            },
            {
              type: "input_text",
              text: req.expectedGp ? `Expected GP: ${req.expectedGp}` : "No expected GP provided."
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
  const output = extractOutputText(data);
  if (!output) {
    if (data.error?.message) {
      throw new Error(`Vision API returned no text output: ${data.error.message}`);
    }
    throw new Error("Vision API returned no parseable text output.");
  }

  const jsonStart = output.indexOf("{");
  const jsonEnd = output.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Vision API response did not contain a JSON object.");
  }

  return JSON.parse(output.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
}

function mergeLeaderboardRows(
  primary: Record<string, unknown>,
  leaderboardOnly: Record<string, unknown>
): Record<string, unknown> {
  const primaryEntities =
    primary.parsed_entities && typeof primary.parsed_entities === "object"
      ? (primary.parsed_entities as Record<string, unknown>)
      : {};

  const leaderboardEntities =
    leaderboardOnly.parsed_entities && typeof leaderboardOnly.parsed_entities === "object"
      ? (leaderboardOnly.parsed_entities as Record<string, unknown>)
      : {};

  const primaryRows = Array.isArray(primaryEntities.leaderboard_rows) ? primaryEntities.leaderboard_rows : [];
  const extraRows = Array.isArray(leaderboardEntities.leaderboard_rows) ? leaderboardEntities.leaderboard_rows : [];

  const mergedRows = primaryRows.length >= extraRows.length ? primaryRows : extraRows;

  return {
    ...primary,
    parsed_entities: {
      ...primaryEntities,
      leaderboard_rows: mergedRows
    }
  };
}

function normalizeParsedResult(raw: unknown, screenshotId: string): ParsedScreenshotResult {
  const value = (raw ?? {}) as Record<string, unknown>;
  const detectedTeamNames = Array.isArray(value.detected_team_names)
    ? value.detected_team_names.filter((item): item is string => typeof item === "string")
    : [];
  const detectedScores = Array.isArray(value.detected_scores)
    ? value.detected_scores.map((item) => Number(item)).filter((n) => Number.isFinite(n))
    : [];

  const parsedEntitiesRaw =
    value.parsed_entities && typeof value.parsed_entities === "object"
      ? (value.parsed_entities as Record<string, unknown>)
      : {};

  const leaderboardRows = Array.isArray(parsedEntitiesRaw.leaderboard_rows)
    ? parsedEntitiesRaw.leaderboard_rows.filter(
        (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object"
      )
    : [];

  const normalizedLeaderboardRows = leaderboardRows.map((row) => ({
    rank: typeof row.rank === "number" && Number.isFinite(row.rank) ? row.rank : null,
    team_name: typeof row.team_name === "string" ? row.team_name : null,
    owner_name: typeof row.owner_name === "string" ? row.owner_name : null,
    score: typeof row.score === "number" && Number.isFinite(row.score) ? row.score : null
  }));

  const parsedEntities: Record<string, unknown> = {
    account:
      typeof parsedEntitiesRaw.account === "string"
        ? parsedEntitiesRaw.account
        : typeof value.detected_account_name === "string"
          ? value.detected_account_name
          : null,
    team_1_name:
      typeof parsedEntitiesRaw.team_1_name === "string"
        ? parsedEntitiesRaw.team_1_name
        : detectedTeamNames[0] ?? null,
    team_2_name:
      typeof parsedEntitiesRaw.team_2_name === "string"
        ? parsedEntitiesRaw.team_2_name
        : detectedTeamNames[1] ?? null,
    team_1_score:
      typeof parsedEntitiesRaw.team_1_score === "number"
        ? parsedEntitiesRaw.team_1_score
        : Number.isFinite(detectedScores[0])
          ? detectedScores[0]
          : null,
    team_2_score:
      typeof parsedEntitiesRaw.team_2_score === "number"
        ? parsedEntitiesRaw.team_2_score
        : Number.isFinite(detectedScores[1])
          ? detectedScores[1]
          : null,
    leaderboard_rows: normalizedLeaderboardRows
  };

  return {
    id: `parse_${screenshotId}`,
    screenshotId,
    gpName: typeof value.gp_name === "string" ? value.gp_name : undefined,
    detectedAccountName: typeof value.detected_account_name === "string" ? value.detected_account_name : undefined,
    detectedTeamNames,
    detectedScores,
    screenshotType: typeof value.screenshot_type === "string" ? value.screenshot_type : undefined,
    parsedEntities,
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

  const primaryPrompt = `You are parsing a private Formula 1 fantasy screenshot.

Return ONE JSON object ONLY (no markdown, no prose) with EXACT keys:
{
  "gp_name": string|null,
  "detected_account_name": string|null,
  "detected_team_names": string[],
  "detected_scores": number[],
  "screenshot_type": string,
  "parsed_entities": {
    "account": string|null,
    "team_1_name": string|null,
    "team_1_score": number|null,
    "team_2_name": string|null,
    "team_2_score": number|null,
    "leaderboard_rows": [
      {
        "rank": number|null,
        "team_name": string|null,
        "owner_name": string|null,
        "score": number|null
      }
    ]
  },
  "confidence_by_field": {
    "gp_name": number,
    "detected_account_name": number,
    "detected_team_names": number,
    "detected_scores": number,
    "screenshot_type": number
  },
  "missing_fields": string[],
  "warnings": string[]
}

Parsing rules for this app:
- The same real player controls exactly TWO fantasy teams.
- If screenshot shows T1 and T2 cards/rows, map those into team_1_* and team_2_*.
- If screenshot is a league table with many rows, fill parsed_entities.leaderboard_rows for every visible row.
- Prefer points visible next to T1/T2 rows for team_1_score and team_2_score.
- If only one score is visible, set the missing team score to null and include it in missing_fields.
- If GP name is not visible, set gp_name to null and add warning.
- confidence_by_field values must be between 0 and 1.
- Do not fabricate names or scores; use null when unknown.
`;

  const leaderboardPrompt = `Extract ONLY leaderboard rows from this F1 fantasy screenshot.
Return JSON only with shape:
{
  "parsed_entities": {
    "leaderboard_rows": [
      {
        "rank": number|null,
        "team_name": string|null,
        "owner_name": string|null,
        "score": number|null
      }
    ]
  }
}

Rules:
- Capture EVERY visible row in the leaderboard list, not only top entries.
- If row data is partially unreadable, include row with null for missing fields.
`;

  const primaryRaw = await runVisionRequest({
    model,
    apiKey,
    baseUrl,
    imageUrl: payload.imageUrl,
    prompt: primaryPrompt,
    expectedGp: payload.forcedGpName
  });

  const leaderboardRaw = await runVisionRequest({
    model,
    apiKey,
    baseUrl,
    imageUrl: payload.imageUrl,
    prompt: leaderboardPrompt,
    expectedGp: payload.forcedGpName
  });

  const merged = mergeLeaderboardRows(primaryRaw, leaderboardRaw);
  return normalizeParsedResult(merged, payload.screenshotId);
}
