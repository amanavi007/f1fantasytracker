import { notFound } from "next/navigation";
import { GpWorkflowStrip } from "@/components/gp-workflow-strip";
import { ReviewRecordCard } from "@/components/review-record-card";
import { ResetGpDataButton } from "@/components/reset-gp-data-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getGpOverview } from "@/lib/data";

export default async function GpReviewPage({ params }: { params: Promise<{ gpId: string }> }) {
  const { gpId } = await params;
  const overview = await getGpOverview(gpId);
  if (!overview) return notFound();

  const lowConfidenceCount = overview.parsed.filter((p) => Object.values(p.confidenceByField).some((v) => v < 0.7)).length;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border/70 bg-black/20 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Parser Review</p>
          <h1 className="mt-2 font-display text-3xl tracking-[0.1em]">{overview.gp.name} Review Queue</h1>
          <p className="mt-1 text-sm text-mutedForeground">Approve extracted records before finalizing punishment results.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="warning">Low confidence: {lowConfidenceCount}</Badge>
          <Badge variant="neutral">Total records: {overview.parsed.length}</Badge>
          <ResetGpDataButton gpId={gpId} size="sm" label="Reset GP" />
          <Button>Approve All Ready</Button>
        </div>
      </section>

      <GpWorkflowStrip status={overview.gp.status} screenshots={overview.screenshots} parsed={overview.parsed} />

      <Card>
        <CardTitle>Workflow Rules</CardTitle>
        <CardDescription className="mt-2">
          1) AI parsing is assistive only. 2) Admin can edit any field. 3) Finalize GP only after review is clean.
        </CardDescription>
      </Card>

      <div className="space-y-4">
        {overview.parsed.map((parsed) => (
          <ReviewRecordCard
            key={parsed.id}
            parsed={parsed}
            screenshot={overview.screenshots.find((s) => s.id === parsed.screenshotId)}
            screenshotPreviewUrl={overview.screenshotPreviewUrls[parsed.screenshotId]}
            players={overview.players}
            autoAssigned={overview.autoAssignedByParsedId.get(parsed.id)}
          />
        ))}
      </div>
    </div>
  );
}
