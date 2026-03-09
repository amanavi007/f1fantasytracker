import Link from "next/link";
import { Flag, ShieldAlert } from "lucide-react";
import { CircuitVisualization } from "@/components/circuit-visualization";
import { StatCard } from "@/components/stat-card";
import { GpStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { computePunishmentBoard, getGpOverview, getGps } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const [gps, punishmentBoardRaw] = await Promise.all([
    getGps(),
    computePunishmentBoard()
  ]);

  const latestFinalizedGp = [...gps].reverse().find((gp) => gp.status === "finalized");
  const activeGp = gps.find((gp) => gp.status !== "finalized") ?? gps[0];
  const latestResult = latestFinalizedGp ? await getGpOverview(latestFinalizedGp.id) : null;
  const punishmentBoard = punishmentBoardRaw.sort((a, b) => b.losses - a.losses);
  const todayIso = new Date().toISOString().slice(0, 10);
  const latestPastIndex = [...gps]
    .map((gp, index) => ({ gp, index }))
    .filter(({ gp }) => gp.raceDate && gp.raceDate <= todayIso)
    .map(({ index }) => index)
    .pop();
  const featuredIndex = latestPastIndex ?? 0;
  const featuredGp = gps[featuredIndex];
  const compactRaceList = gps.filter((_, index) => index !== featuredIndex).slice(Math.max(0, featuredIndex - 2), Math.max(0, featuredIndex - 2) + 5);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-black/25 p-6 shadow-race">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Race Weekend Control</p>
        <h1 className="mt-2 font-display text-4xl tracking-[0.08em] text-white">F1 Fantasy Tracker</h1>
        <p className="mt-3 max-w-3xl text-sm text-mutedForeground">
          GP-by-GP punishment logic. Each player runs two teams, punishment score = team1 + team2 for that GP only.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/upload">Batch Upload Screenshots</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/gps">Open GP History</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        <StatCard
          title="Latest GP Loser"
          value={
            latestResult?.punishment.loserPlayerIds.length
              ? latestResult.punishment.loserPlayerIds
                  .map((playerId) => latestResult.players.find((p) => p.id === playerId)?.displayName ?? playerId)
                  .join(", ")
              : "TBD"
          }
          subText={latestFinalizedGp?.name ?? "No finalized GP yet"}
          icon={<ShieldAlert />}
        />
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-mutedForeground">Current GP</p>
              <p className="mt-2 font-display text-3xl tracking-wider text-white">{activeGp?.name ?? "No active GP"}</p>
              <p className="mt-2 text-sm text-mutedForeground">{activeGp ? formatDate(activeGp.raceDate) : "No date"}</p>
            </div>
            <div className="text-accent">
              <Flag />
            </div>
          </div>
          <CircuitVisualization gpName={activeGp?.name ?? "Current GP"} />
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Current Race Control</CardTitle>
          <CardDescription className="mt-1">Featured latest race plus compact recent rounds list.</CardDescription>
          {featuredGp ? (
            <div className="mt-4 rounded-lg border border-accent/40 bg-accent/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-accent">Latest Race</p>
                  <p className="mt-1 font-display text-xl text-white">{featuredGp.name}</p>
                  <p className="text-xs text-mutedForeground">{formatDate(featuredGp.raceDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <GpStatusBadge status={featuredGp.status} />
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/gps/${featuredGp.id}`}>Open</Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
            {compactRaceList.map((gp) => (
              <div key={gp.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-black/20 px-3 py-2">
                <div>
                  <p className="font-medium">{gp.name}</p>
                  <p className="text-xs text-mutedForeground">{formatDate(gp.raceDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <GpStatusBadge status={gp.status} />
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/gps/${gp.id}`}>Open</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Punishment Pressure Index</CardTitle>
          <CardDescription className="mt-1">Most exposed profiles based on finalized GPs.</CardDescription>
          <div className="mt-4 space-y-2">
            {punishmentBoard.map((row) => (
              <div key={row.playerId} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{row.playerName}</p>
                  {row.losses >= 1 ? <Badge variant="danger">Fraud Watch</Badge> : <Badge variant="success">Safe</Badge>}
                </div>
                <div className="text-sm text-mutedForeground">
                  Lasts: <span className="text-white">{row.losses}</span> | 2nd Lasts: <span className="text-white">{row.secondLasts}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
