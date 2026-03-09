import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const gpId = String(formData.get("gpId") ?? "").trim();

  if (!gpId) {
    return NextResponse.json({ error: "gpId is required." }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files were uploaded." }, { status: 400 });
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "screenshots";
  const supabase = getSupabaseServerClient();

  const inserts: Array<{ id: string; fileName: string; storagePath: string; hash: string }> = [];

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const hash = createHash("sha1").update(buffer).digest("hex");
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".png";
    const storagePath = `${gpId}/${Date.now()}_${randomUUID()}${ext}`;

    const { error: storageError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      upsert: false,
      contentType: file.type || "image/png"
    });

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 400 });
    }

    const { data: row, error: insertError } = await supabase
      .from("screenshot_uploads")
      .insert({
        gp_id: gpId,
        file_name: file.name,
        storage_path: storagePath,
        file_hash: hash,
        uploaded_by: "admin"
      })
      .select("id")
      .single();

    if (insertError || !row) {
      return NextResponse.json({ error: insertError?.message ?? "Failed to save upload row." }, { status: 400 });
    }

    inserts.push({ id: row.id, fileName: file.name, storagePath, hash });
  }

  return NextResponse.json({ uploads: inserts });
}
