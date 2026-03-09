import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { uploadId } = await params;
  const supabase = getSupabaseServerClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "screenshots";

  const { data: upload, error: fetchError } = await supabase
    .from("screenshot_uploads")
    .select("id, storage_path")
    .eq("id", uploadId)
    .maybeSingle();

  if (fetchError || !upload) {
    return NextResponse.json({ error: "Screenshot row not found." }, { status: 404 });
  }

  const { error: storageError } = await supabase.storage.from(bucket).remove([upload.storage_path]);
  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 400 });
  }

  const { error: deleteError } = await supabase.from("screenshot_uploads").delete().eq("id", uploadId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, deletedId: uploadId });
}
