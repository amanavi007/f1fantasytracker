import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { computePunishmentBoard, getGps } from "@/lib/data";

export default async function StatsPage() {
  const [boardRaw, gps] = await Promise.all([computePunishmentBoard(), getGps()]);
  const board = boardRaw.sort((a, b) => b.losses - a.losses);
  const safest = [...board].sort((a, b) => a.losses - b.losses)[0];

  const stats = [
    {
      label: "Most Last-Place Finishes",
      value: board[0] ? `${board[0].playerName} (${board[0].losses})` : "N/A"
    },
    {
      label: "Most Second-Last Finishes",
      value: board[0] ? `${board[0].playerName} (${board[0].secondLasts})` : "N/A"
    },
    {
      label: "Safest Driver",
      value: safest ? safest.playerName : "N/A"
    },
    {
      label: "Biggest Single GP Disaster",
      value: "Arun - Chinese GP"
    },
    {
      label: "Fraud Watch",
      value: board.filter((b) => b.losses > 0).map((b) => b.playerName).join(", ") || "Nobody"
    },
    {
      label: "Completed GP Punishments",
      value: `${gps.filter((gp) => gp.status === "finalized").length}`
    }
  ];

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Fun Analytics</p>
        <h1 className="mt-2 font-display text-3xl tracking-[0.1em]">Shame Stats</h1>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <div className="absolute right-0 top-0 h-16 w-16 bg-accent/10 blur-2xl" />
            <CardDescription className="uppercase tracking-[0.12em]">{stat.label}</CardDescription>
            <CardTitle className="mt-3 font-display text-2xl tracking-wide">{stat.value}</CardTitle>
          </Card>
        ))}
      </div>
    </div>
  );
}
