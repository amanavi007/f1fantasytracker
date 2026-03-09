import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PlayerCreateForm } from "@/components/player-create-form";
import { computePunishmentBoard, getPlayers } from "@/lib/data";

export default async function PlayersPage() {
  const [board, players] = await Promise.all([computePunishmentBoard(), getPlayers()]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">League Control</p>
        <h1 className="mt-2 font-display text-3xl tracking-[0.1em]">Players & Team Mapping</h1>
      </section>

      <Card>
        <CardTitle>Add / Edit Player</CardTitle>
        <CardDescription className="mt-1">Set official nickname, two teams, aliases, and join GP.</CardDescription>
        <div className="mt-4">
          <PlayerCreateForm />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {players.map((player) => {
          const row = board.find((b) => b.playerId === player.id);
          return (
            <Card key={player.id}>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{player.displayName}</CardTitle>
                  <CardDescription>{player.realName ?? "No real name set"}</CardDescription>
                </div>
                <Badge variant={player.isActive ? "success" : "neutral"}>{player.isActive ? "Active" : "Inactive"}</Badge>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <p>
                  Team 1: <span className="text-white">{player.team1Name}</span>
                </p>
                <p>
                  Team 2: <span className="text-white">{player.team2Name}</span>
                </p>
                <p>
                  Aliases: <span className="text-mutedForeground">{player.aliases.join(", ")}</span>
                </p>
                <p>
                  Punishments: <span className="text-accent">{row?.losses ?? 0}</span> | 2nd lasts: {row?.secondLasts ?? 0}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
