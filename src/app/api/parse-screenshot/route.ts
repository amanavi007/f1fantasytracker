import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { openAIVisionParse } from "@/lib/parser";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  screenshotId: z.string(),
  forcedGpName: z.string().optional()
});

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const payload = payloadSchema.parse(body);
  const supabase = getSupabaseServerClient();

  const { data: screenshot, error: screenshotError } = await supabase
    .from("screenshot_uploads")
    .select("id, gp_id, file_name, storage_path")
    .eq("id", payload.screenshotId)
    .maybeSingle();

  if (screenshotError || !screenshot) {
    return NextResponse.json({ error: "Screenshot not found." }, { status: 404 });
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "screenshots";
  const { data: signed, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(screenshot.storage_path, 60 * 10);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not generate signed URL for screenshot." }, { status: 500 });
  }

  const parsed = await openAIVisionParse({
    screenshotId: screenshot.id,
    imageUrl: signed.signedUrl,
    forcedGpName: payload.forcedGpName
  });

  await supabase.from("parsed_screenshot_results").insert({
    screenshot_id: screenshot.id,
    parser_name: process.env.VISION_MODEL || "gpt-4.1-mini",
    gp_name: parsed.gpName ?? null,
    detected_account_name: parsed.detectedAccountName ?? null,
    detected_team_names: parsed.detectedTeamNames,
    detected_scores: parsed.detectedScores,
    screenshot_type: parsed.screenshotType ?? null,
    parsed_entities: parsed.parsedEntities,
    confidence_by_field: parsed.confidenceByField,
    missing_fields: parsed.missingFields,
    warnings: parsed.warnings,
    approved: false
  });

  return NextResponse.json({
    parser: process.env.VISION_MODEL || "gpt-4.1-mini",
    parsed
  });
}
