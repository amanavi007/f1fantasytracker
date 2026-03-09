import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  detectedAccountName: z.string().optional(),
  team1Score: z.number().nullable().optional(),
  team2Score: z.number().nullable().optional(),
  approved: z.boolean().optional(),
  editedBy: z.string().default("admin"),
  reason: z.string().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ parsedResultId: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { parsedResultId } = await params;
  const payload = schema.parse(await request.json());
  const supabase = getSupabaseServerClient();

  const { data: parsed, error: parsedError } = await supabase
    .from("parsed_screenshot_results")
    .select("id, screenshot_id, detected_account_name, parsed_entities")
    .eq("id", parsedResultId)
    .single();

  if (parsedError || !parsed) {
    return NextResponse.json({ error: "Parsed record not found." }, { status: 404 });
  }

  const { data: screenshot } = await supabase
    .from("screenshot_uploads")
    .select("gp_id")
    .eq("id", parsed.screenshot_id)
    .single();

  const originalEntities = (parsed.parsed_entities ?? {}) as Record<string, string | number | null>;
  const nextEntities = {
    ...originalEntities,
    ...(payload.team1Score !== undefined ? { team_1_score: payload.team1Score } : {}),
    ...(payload.team2Score !== undefined ? { team_2_score: payload.team2Score } : {})
  };

  const edits: Array<{ field: string; from: string; to: string }> = [];

  if (payload.detectedAccountName !== undefined && payload.detectedAccountName !== parsed.detected_account_name) {
    edits.push({
      field: "detected_account_name",
      from: String(parsed.detected_account_name ?? ""),
      to: String(payload.detectedAccountName)
    });
  }

  if (payload.team1Score !== undefined && payload.team1Score !== (originalEntities.team_1_score ?? null)) {
    edits.push({
      field: "team_1_score",
      from: String(originalEntities.team_1_score ?? ""),
      to: String(payload.team1Score ?? "")
    });
  }

  if (payload.team2Score !== undefined && payload.team2Score !== (originalEntities.team_2_score ?? null)) {
    edits.push({
      field: "team_2_score",
      from: String(originalEntities.team_2_score ?? ""),
      to: String(payload.team2Score ?? "")
    });
  }

  await supabase
    .from("parsed_screenshot_results")
    .update({
      detected_account_name: payload.detectedAccountName ?? parsed.detected_account_name,
      parsed_entities: nextEntities,
      approved: payload.approved ?? false,
      updated_at: new Date().toISOString()
    })
    .eq("id", parsedResultId);

  if (screenshot?.gp_id && edits.length > 0) {
    await supabase.from("correction_logs").insert(
      edits.map((edit) => ({
        gp_id: screenshot.gp_id,
        screenshot_id: parsed.screenshot_id,
        target_table: "parsed_screenshot_results",
        target_row_id: parsed.id,
        field_name: edit.field,
        original_value: edit.from,
        corrected_value: edit.to,
        edited_by: payload.editedBy,
        reason: payload.reason ?? null
      }))
    );
  }

  return NextResponse.json({ ok: true, edits: edits.length });
}
