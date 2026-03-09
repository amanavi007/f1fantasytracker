import { Flame, ShieldAlert } from "lucide-react";
import { PunishmentCompletionToggle } from "@/components/punishment-completion-toggle";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { computePunishmentBoard, getGpOverview, getGps, getPlayers, getPunishmentCompletions } from "@/lib/data";

export default async function PunishmentsPage() {
  const [boardRaw, gps, players, completionMap] = await Promise.all([
    computePunishmentBoard(),
    getGps(),
    getPlayers(),
    getPunishmentCompletions()
  ]);
  const board = boardRaw.sort((a, b) => b.losses - a.losses || b.secondLasts - a.secondLasts);
  const finalized = gps.filter((gp) => gp.status === "finalized");
  const gpLossCards = await Promise.all(
    finalized.map(async (gp) => {
      const summary = await getGpOverview(gp.id);
      const loserIds = summary?.punishment.loserPlayerIds ?? [];

      return (
        <div key={gp.id} className="rounded-md border border-border/60 p-3">
          <p className="font-medium">{gp.name}</p>
          <div className="mt-2 space-y-2">
            {loserIds.length === 0 ? <p className="text-sm text-mutedForeground">Loser: TBD</p> : null}
            {loserIds.map((loserId) => {
              const player = players.find((p) => p.id === loserId);
              const completed = completionMap.get(`${gp.id}:${loserId}`) ?? false;
              return (
                <div key={`${gp.id}_${loserId}`} className="flex items-center justify-between rounded-md border border-border/60 px-2 py-2">
                  <p className="text-sm">{player?.displayName ?? loserId}</p>
                  <PunishmentCompletionToggle gpId={gp.id} playerId={loserId} initialCompleted={completed} />
                </div>
              );
            })}
          </div>
        </div>
      );
    })
  );

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Consequences</p>
        <h1 className="mt-2 font-display text-3xl tracking-[0.1em]">Punishment Board</h1>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Most Last Places"
          value={board[0] ? `${board[0].playerName} (${board[0].losses})` : "N/A"}
          icon={<ShieldAlert />}
        />
        <StatCard
          title="Most Second Last"
          value={board[0] ? `${board[0].playerName} (${board[0].secondLasts})` : "N/A"}
          icon={<Flame />}
        />
        <StatCard title="Finalized GPs" value={String(finalized.length)} />
        <StatCard title="Players in Danger" value={String(board.filter((b) => b.losses > 0).length)} />
      </section>

      <Card>
        <CardTitle>League Punishment Ladder</CardTitle>
        <CardDescription className="mt-1">GP-by-GP punishment events only. No season cumulative score for penalties.</CardDescription>
        <div className="mt-4 space-y-2">
          {board.map((row) => (
            <div key={row.playerId} className="flex items-center justify-between rounded-lg border border-border/60 bg-black/15 px-3 py-2">
              <div className="flex items-center gap-2">
                <p className="font-medium">{row.playerName}</p>
                {row.losses > 0 ? <Badge variant="danger">In Danger</Badge> : <Badge variant="success">Safe Zone</Badge>}
              </div>
              <p className="text-sm text-mutedForeground">
                Lasts: <span className="text-white">{row.losses}</span> | Second Lasts: <span className="text-white">{row.secondLasts}</span>
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Who Lost Each GP</CardTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{gpLossCards}</div>
      </Card>
    </div>
  );
}
