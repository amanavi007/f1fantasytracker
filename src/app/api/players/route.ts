import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  displayName: z.string().min(1),
  realName: z.string().nullable().optional(),
  team1Name: z.string().min(1),
  team2Name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  notes: z.string().nullable().optional()
});

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const payload = schema.parse(body);
  const supabase = getSupabaseServerClient();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      display_name: payload.displayName,
      real_name: payload.realName ?? null,
      notes: payload.notes ?? null,
      is_active: true
    })
    .select("id")
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: playerError?.message ?? "Could not create player." }, { status: 400 });
  }

  const aliases = payload.aliases.map((alias) => ({ player_id: player.id, alias }));
  const teams = [
    { player_id: player.id, slot: 1, team_name: payload.team1Name, is_active: true },
    { player_id: player.id, slot: 2, team_name: payload.team2Name, is_active: true }
  ];

  if (aliases.length > 0) {
    await supabase.from("player_aliases").insert(aliases);
  }

  await supabase.from("fantasy_teams").insert(teams);

  return NextResponse.json({ playerId: player.id });
}
