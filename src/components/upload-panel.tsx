"use client";

import { useMemo, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gp, ScreenshotUpload } from "@/lib/types";

export function UploadPanel({ gps, uploads }: { gps: Gp[]; uploads: ScreenshotUpload[] }) {
  const [gpId, setGpId] = useState(gps.find((g) => g.status !== "finalized")?.id ?? gps[0]?.id);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => uploads.filter((s) => s.gpId === gpId), [gpId, uploads]);

  async function uploadBatch(runParse: boolean) {
    if (!gpId || !files || files.length === 0) {
      setMessage("Choose a GP and at least one screenshot.");
      return;
    }

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("gpId", gpId);
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json().catch(() => ({}))) as {
      uploads?: Array<{ id: string }>;
      error?: string;
    };

    if (!response.ok || !payload.uploads) {
      setMessage(payload.error || "Upload failed.");
      setUploading(false);
      return;
    }

    if (runParse) {
      await Promise.all(
        payload.uploads.map((upload) =>
          fetch("/api/parse-screenshot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ screenshotId: upload.id })
          })
        )
      );
    }

    setMessage(runParse ? "Uploaded and sent to parser. Refreshing..." : "Uploaded. Refreshing...");
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>1. Select GP</CardTitle>
        <div className="mt-3 max-w-sm">
          <Select value={gpId} onValueChange={setGpId}>
            <SelectTrigger>
              <SelectValue placeholder="Select GP" />
            </SelectTrigger>
            <SelectContent>
              {gps.map((gp) => (
                <SelectItem key={gp.id} value={gp.id}>
                  {gp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <CardTitle>2. Upload Screenshots</CardTitle>
        <CardDescription className="mt-1">Uploads go to Supabase storage + screenshot_uploads table.</CardDescription>
        <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
          <UploadCloud className="mx-auto h-10 w-10 text-accent" />
          <p className="mt-2 text-sm text-mutedForeground">Drag screenshots here or browse files.</p>
          <Input type="file" className="mx-auto mt-4 max-w-md" multiple onChange={(e) => setFiles(e.target.files)} />
          <div className="mt-4 flex justify-center gap-2">
            <Button disabled={uploading} onClick={() => uploadBatch(false)}>
              {uploading ? "Uploading..." : "Upload Batch"}
            </Button>
            <Button variant="outline" disabled={uploading} onClick={() => uploadBatch(true)}>
              {uploading ? "Running..." : "Upload + Parse"}
            </Button>
          </div>
          {message ? <p className="mt-3 text-sm text-mutedForeground">{message}</p> : null}
        </div>
      </Card>

      <Card>
        <CardTitle>3. Duplicate / Wrong GP Warnings</CardTitle>
        <div className="mt-3 space-y-2">
          {filtered.map((shot) => {
            const dup = filtered.filter((s) => s.hash && s.hash === shot.hash).length > 1;
            return (
              <div key={shot.id} className="rounded-md border border-border/70 px-3 py-2 text-sm">
                <p className="text-white">{shot.fileName}</p>
                <p className="text-xs text-mutedForeground">hash: {shot.hash || "(none)"}</p>
                {dup ? <p className="mt-1 text-xs text-amber-300">Warning: possible duplicate screenshot</p> : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
