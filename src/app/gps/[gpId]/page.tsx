import Link from "next/link";
import { notFound } from "next/navigation";
import { GpStatusBadge, SubmissionStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { TD, TH, TBody, THead, TR, Table } from "@/components/ui/table";
import { FinalizeGpButton } from "@/components/finalize-gp-button";
import { GpWorkflowStrip } from "@/components/gp-workflow-strip";
import { ManualScoreForm } from "@/components/manual-score-form";
import { getGpOverview } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function GpDetailPage({ params }: { params: Promise<{ gpId: string }> }) {
  const { gpId } = await params;
  const overview = await getGpOverview(gpId);
  if (!overview) return notFound();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-black/20 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">GP Detail</p>
            <h1 className="mt-1 font-display text-3xl tracking-[0.08em]">{overview.gp.name}</h1>
            <p className="mt-1 text-sm text-mutedForeground">{formatDate(overview.gp.raceDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <GpStatusBadge status={overview.gp.status} />
            <Button variant="outline" asChild>
              <Link href={`/gps/${gpId}/review`}>Open Parser Review</Link>
            </Button>
            <FinalizeGpButton gpId={gpId} isFinalized={overview.gp.status === "finalized"} />
          </div>
        </div>
      </section>

      <GpWorkflowStrip status={overview.gp.status} screenshots={overview.screenshots} parsed={overview.parsed} />

      <Card>
        <CardTitle>Ranking (Lowest Combined = Loser)</CardTitle>
        <CardDescription className="mt-1">Punishment score uses team 1 + team 2 for this GP only.</CardDescription>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Rank</TH>
                <TH>Player</TH>
                <TH>Team 1</TH>
                <TH>Team 2</TH>
                <TH>Combined</TH>
              </TR>
            </THead>
            <TBody>
              {overview.rows.map((row) => {
                const isLoser = overview.punishment.loserPlayerIds.includes(row.playerId);
                const isSecond = overview.punishment.secondLastPlayerIds.includes(row.playerId);
                return (
                  <TR key={row.playerId} className={isLoser ? "bg-red-500/10" : ""}>
                    <TD>{row.rank ?? "-"}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span>{row.playerName}</span>
                        {isLoser ? <Badge variant="danger">Loser</Badge> : null}
                        {isSecond ? <Badge variant="warning">Second Last</Badge> : null}
                      </div>
                    </TD>
                    <TD>{row.team1Score ?? "-"}</TD>
                    <TD>{row.team2Score ?? "-"}</TD>
                    <TD className="font-semibold text-white">{row.combined ?? "Incomplete"}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Submission Status</CardTitle>
          <div className="mt-4 space-y-2">
            {overview.entries.map((entry) => {
              const player = overview.players.find((p) => p.id === entry.playerId);
              return (
                <div key={entry.id} className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
                  <div>
                    <span>{player?.displayName ?? entry.playerId}</span>
                    <ManualScoreForm gpId={gpId} playerId={entry.playerId} />
                  </div>
                  <SubmissionStatusBadge status={entry.status} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardTitle>Screenshot Gallery</CardTitle>
          <CardDescription className="mt-1">Original uploads retained for audits and disputes.</CardDescription>
          <div className="mt-4 space-y-2">
            {overview.screenshots.map((shot) => (
              <div key={shot.id} className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm">
                <div>
                  <p className="text-white">{shot.fileName}</p>
                  <p className="text-xs text-mutedForeground">{shot.storagePath}</p>
                </div>
                <Badge variant="neutral">Open</Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
