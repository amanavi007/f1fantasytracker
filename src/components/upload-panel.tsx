"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gp, ScreenshotUpload } from "@/lib/types";

export function UploadPanel({ gps, uploads }: { gps: Gp[]; uploads: ScreenshotUpload[] }) {
  const router = useRouter();
  const [gpId, setGpId] = useState(gps.find((g) => g.status !== "finalized")?.id ?? gps[0]?.id);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);

  const filtered = useMemo(() => uploads.filter((s) => s.gpId === gpId), [gpId, uploads]);
  const selectedGp = gps.find((g) => g.id === gpId);

  async function uploadAndParse() {
    if (!gpId || !files || files.length === 0) {
      setMessage("Choose a GP and at least one screenshot.");
      return;
    }

    setUploading(true);
    setMessage(null);
    setDetails([]);

    const formData = new FormData();
    formData.append("gpId", gpId);
    const selectedFiles = Array.from(files);
    for (const file of selectedFiles) {
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

    const lines: string[] = [];
    lines.push(`Uploaded ${payload.uploads.length}/${selectedFiles.length} screenshots.`);

    const parseResponses = await Promise.all(
      payload.uploads.map((upload) =>
        fetch("/api/parse-screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ screenshotId: upload.id })
        })
      )
    );

    const parseOk = parseResponses.filter((res) => res.ok).length;
    const parseFailed = parseResponses.length - parseOk;
    lines.push(`Parsed ${parseOk}/${parseResponses.length} screenshots.`);
    if (parseFailed > 0) {
      const failedDetails = await Promise.all(
        parseResponses.map(async (response, index) => {
          if (response.ok) return null;
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          return `Parse failed for upload #${index + 1}: ${body.error ?? `HTTP ${response.status}`}`;
        })
      );
      for (const detail of failedDetails.filter(Boolean)) {
        lines.push(detail as string);
      }
    }

    setMessage("Upload + auto-parse completed.");
    setDetails(lines);
    setUploading(false);
    router.push(`/gps/${gpId}/review`);
    router.refresh();
  }

  async function deleteScreenshot(uploadId: string) {
    setDeletingId(uploadId);
    setMessage(null);

    const response = await fetch(`/api/uploads/${uploadId}`, {
      method: "DELETE"
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setMessage(payload.error || "Failed to delete screenshot.");
      setDeletingId(null);
      return;
    }

    setMessage("Screenshot deleted.");
    setDeletingId(null);
    router.refresh();
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
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="neutral">{selectedGp?.name ?? "No GP selected"}</Badge>
          <Badge variant="neutral">Screenshots: {filtered.length}</Badge>
          <Link href={gpId ? `/gps/${gpId}` : "/gps"} className="text-accent">
            Open GP Detail
          </Link>
          <Link href={gpId ? `/gps/${gpId}/review` : "/gps"} className="text-accent">
            Open Parser Review
          </Link>
        </div>
      </Card>

      <Card>
        <CardTitle>2. Upload + Auto Parse</CardTitle>
        <CardDescription className="mt-1">Each screenshot is uploaded, then parsed automatically.</CardDescription>
        <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
          <UploadCloud className="mx-auto h-10 w-10 text-accent" />
          <p className="mt-2 text-sm text-mutedForeground">Drag screenshots here or browse files.</p>
          <Input type="file" className="mx-auto mt-4 max-w-md" multiple onChange={(e) => setFiles(e.target.files)} />
          {files?.length ? (
            <div className="mx-auto mt-3 max-w-xl rounded-md border border-border/60 bg-black/20 p-2 text-left text-xs text-mutedForeground">
              {Array.from(files)
                .slice(0, 5)
                .map((file) => (
                  <p key={file.name}>{file.name}</p>
                ))}
              {files.length > 5 ? <p>+ {files.length - 5} more</p> : null}
            </div>
          ) : null}
          <div className="mt-4 flex justify-center gap-2">
            <Button disabled={uploading} onClick={() => uploadAndParse()}>
              {uploading ? "Uploading + Parsing..." : "Upload + Auto Parse"}
            </Button>
          </div>
          {message ? <p className="mt-3 text-sm text-mutedForeground">{message}</p> : null}
          {details.length > 0 ? (
            <div className="mx-auto mt-3 max-w-xl rounded-md border border-border/60 bg-black/20 p-3 text-left text-xs text-mutedForeground">
              {details.map((line) => (
                <p key={line}>• {line}</p>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardTitle>3. Screenshot Manager</CardTitle>
        <CardDescription className="mt-1">Delete old uploads for this GP. This also removes linked parsed rows.</CardDescription>
        <div className="mt-3 space-y-2">
          {filtered.length === 0 ? <p className="text-sm text-mutedForeground">No screenshots uploaded for this GP yet.</p> : null}
          {filtered.map((shot) => (
            <div key={shot.id} className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm">
              <div>
                <p className="text-white">{shot.fileName}</p>
                <p className="text-xs text-mutedForeground">Uploaded {new Date(shot.uploadedAt).toLocaleString()}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={deletingId === shot.id}
                onClick={() => deleteScreenshot(shot.id)}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                {deletingId === shot.id ? "Deleting" : "Delete"}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
