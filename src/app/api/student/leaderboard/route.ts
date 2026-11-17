import { NextResponse } from "next/server";
import { getRoom, requireMember } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { listRoomMembers } from "@/lib/server/rooms";
import type { LeaderboardResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/student/leaderboard — อันดับแต้มเฉพาะห้องตัวเอง (แต้มเท่ากัน = อันดับเท่ากัน) */
export const GET = route(async (req) => {
  const { user } = await requireMember(req);
  const [room, members] = await Promise.all([getRoom(user.room_id), listRoomMembers(user.room_id)]);

  members.sort(
    (a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name, "th"),
  );
  let rank = 0;
  let previous_points: number | null = null;
  const entries = members.map((m, i) => {
    if (m.total_points !== previous_points) rank = i + 1;
    previous_points = m.total_points;
    return {
      rank,
      line_user_id: m.line_user_id,
      display_name: m.display_name,
      picture_url: m.picture_url,
      total_points: m.total_points,
      is_me: m.line_user_id === user.line_user_id,
    };
  });

  const body: LeaderboardResponse = { room_name: room?.room_name ?? "", entries };
  return NextResponse.json(body);
});
