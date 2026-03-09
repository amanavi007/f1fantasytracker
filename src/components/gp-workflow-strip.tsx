import { CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { GpStatus, ParsedScreenshotResult, ScreenshotUpload } from "@/lib/types";

function Step({ label, done, meta }: { label: string; done: boolean; meta?: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-black/20 p-3">
      <div className="flex items-center gap-2">
        {done ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <CircleDashed className="h-4 w-4 text-mutedForeground" />}
        <p className="text-sm font-medium text-white">{label}</p>
      </div>
      {meta ? <p className="mt-1 text-xs text-mutedForeground">{meta}</p> : null}
      <div className="mt-2">{done ? <Badge variant="success">Done</Badge> : <Badge variant="warning">Pending</Badge>}</div>
    </div>
  );
}

export function GpWorkflowStrip({
  status,
  screenshots,
  parsed
}: {
  status: GpStatus;
  screenshots: ScreenshotUpload[];
  parsed: ParsedScreenshotResult[];
}) {
  const uploaded = screenshots.length > 0;
  const parsedDone = parsed.length > 0;
  const reviewed = parsed.length > 0 && parsed.every((item) => item.approved);
  const finalized = status === "finalized";

  return (
    <Card>
      <CardTitle>Workflow Progress</CardTitle>
      <CardDescription className="mt-1">Race-day path: Upload | Parse | Review | Finalize</CardDescription>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Step label="Screenshots Uploaded" done={uploaded} meta={`${screenshots.length} file(s)`} />
        <Step label="Parsed Records" done={parsedDone} meta={`${parsed.length} parsed`} />
        <Step
          label="Admin Review"
          done={reviewed}
          meta={parsed.length ? `${parsed.filter((item) => item.approved).length}/${parsed.length} approved` : "No parsed records yet"}
        />
        <Step label="GP Finalized" done={finalized} meta={`Status: ${status}`} />
      </div>
    </Card>
  );
}
