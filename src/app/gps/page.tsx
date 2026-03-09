import Link from "next/link";
import { GpStatusBadge } from "@/components/status-badge";
import { Card, CardTitle } from "@/components/ui/card";
import { getGpOverview, getGps } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function GpHistoryPage() {
  const gps = await getGps();
  const overviews = await Promise.all(gps.map((gp) => getGpOverview(gp.id)));
  const overviewByGpId = new Map(gps.map((gp, index) => [gp.id, overviews[index]]));
  const newestFirst = [...gps].reverse();
  const latestGp = newestFirst[0];
  const priorGps = newestFirst.slice(1);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Race Archive</p>
        <h1 className="mt-2 font-display text-3xl tracking-[0.1em]">Grand Prix History</h1>
      </section>

      {latestGp ? (
        <Card className="border-accent/40 bg-gradient-to-br from-accent/10 via-black/30 to-black/40 p-1">
          <div className="rounded-xl border border-border/70 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-accent">Most Recent GP</p>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-3xl tracking-[0.08em] text-white">{latestGp.name}</h2>
                <p className="mt-1 text-sm text-mutedForeground">{formatDate(latestGp.raceDate)}</p>
              </div>
              <GpStatusBadge status={latestGp.status} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-border/60 bg-black/20 px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-[0.12em] text-mutedForeground">Loser</p>
                <p className="mt-1 text-white">
                  {overviewByGpId
                    .get(latestGp.id)
                    ?.punishment.loserPlayerIds.map((id) => overviewByGpId.get(latestGp.id)?.players.find((p) => p.id === id)?.displayName ?? id)
                    .join(", ") || "TBD"}
                </p>
              </div>
              <div className="rounded-md border border-border/60 bg-black/20 px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-[0.12em] text-mutedForeground">Second Last</p>
                <p className="mt-1 text-white">
                  {overviewByGpId
                    .get(latestGp.id)
                    ?.punishment.secondLastPlayerIds.map((id) => overviewByGpId.get(latestGp.id)?.players.find((p) => p.id === id)?.displayName ?? id)
                    .join(", ") || "TBD"}
                </p>
              </div>
              <div className="rounded-md border border-border/60 bg-black/20 px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-[0.12em] text-mutedForeground">Submissions</p>
                <p className="mt-1 text-white">{overviewByGpId.get(latestGp.id)?.entries.length ?? 0}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link className="text-sm text-accent" href={`/gps/${latestGp.id}`}>
                Open GP Detail
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Previous GPs</CardTitle>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {priorGps.map((gp) => {
            const overview = overviewByGpId.get(gp.id);
            const loser = overview?.punishment.loserPlayerIds
              .map((id) => overview.players.find((p) => p.id === id)?.displayName ?? id)
              .join(", ");
            const second = overview?.punishment.secondLastPlayerIds
              .map((id) => overview.players.find((p) => p.id === id)?.displayName ?? id)
              .join(", ");

            return (
              <div key={gp.id} className="rounded-lg border border-border/70 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white">{gp.name}</p>
                  <GpStatusBadge status={gp.status} />
                </div>
                <p className="mt-1 text-xs text-mutedForeground">{formatDate(gp.raceDate)}</p>
                <p className="mt-2 text-xs text-mutedForeground">Loser: {loser || "TBD"}</p>
                <p className="text-xs text-mutedForeground">Second Last: {second || "TBD"}</p>
                <Link className="mt-2 inline-block text-xs text-accent" href={`/gps/${gp.id}`}>
                  Open GP Detail
                </Link>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
