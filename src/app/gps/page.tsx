import Link from "next/link";
import { GpStatusBadge } from "@/components/status-badge";
import { Card, CardTitle } from "@/components/ui/card";
import { TD, TH, TBody, THead, TR, Table } from "@/components/ui/table";
import { getGpOverview, getGps } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function GpHistoryPage() {
  const gps = await getGps();
  const overviews = await Promise.all(gps.map((gp) => getGpOverview(gp.id)));

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Race Archive</p>
        <h1 className="mt-2 font-display text-3xl tracking-[0.1em]">Grand Prix History</h1>
      </section>

      <Card>
        <CardTitle>All GPs</CardTitle>
        <div className="mt-4 grid gap-3 md:hidden">
          {gps.map((gp, index) => {
            const overview = overviews[index];
            const loser = overview?.punishment.loserPlayerIds
              .map((id) => overview.players.find((p) => p.id === id)?.displayName ?? id)
              .join(", ");
            const second = overview?.punishment.secondLastPlayerIds
              .map((id) => overview.players.find((p) => p.id === id)?.displayName ?? id)
              .join(", ");

            return (
              <div key={gp.id} className="rounded-lg border border-border/70 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-white">{gp.name}</p>
                  <GpStatusBadge status={gp.status} />
                </div>
                <p className="mt-1 text-xs text-mutedForeground">{formatDate(gp.raceDate)}</p>
                <p className="mt-2 text-xs text-mutedForeground">Loser: {loser || "TBD"}</p>
                <p className="text-xs text-mutedForeground">Second Last: {second || "TBD"}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Link className="text-xs text-accent" href={`/gps/${gp.id}`}>
                    Open GP Detail
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 overflow-x-auto">
          <Table className="hidden md:table">
            <THead>
              <TR>
                <TH>GP</TH>
                <TH>Date</TH>
                <TH>Status</TH>
                <TH>Loser</TH>
                <TH>Second Last</TH>
                <TH>Submissions</TH>
                <TH className="text-right">Open</TH>
              </TR>
            </THead>
            <TBody>
              {gps.map((gp, index) => {
                const overview = overviews[index];
                const loser = overview?.punishment.loserPlayerIds
                  .map((id) => overview.players.find((p) => p.id === id)?.displayName ?? id)
                  .join(", ");
                const second = overview?.punishment.secondLastPlayerIds
                  .map((id) => overview.players.find((p) => p.id === id)?.displayName ?? id)
                  .join(", ");
                return (
                  <TR key={gp.id}>
                    <TD>{gp.name}</TD>
                    <TD>{formatDate(gp.raceDate)}</TD>
                    <TD>
                      <GpStatusBadge status={gp.status} />
                    </TD>
                    <TD>{loser || "TBD"}</TD>
                    <TD>{second || "TBD"}</TD>
                    <TD>{overview?.entries.length ?? 0}</TD>
                    <TD className="text-right">
                      <Link className="text-accent" href={`/gps/${gp.id}`}>
                        View GP
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
