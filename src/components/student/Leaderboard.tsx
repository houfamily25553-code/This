"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { api } from "@/lib/client/api";
import type { LeaderboardResponse } from "@/lib/types";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/** อันดับแต้มในห้องตัวเอง */
export function Leaderboard() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<LeaderboardResponse>("/api/student/leaderboard")
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "โหลดอันดับไม่สำเร็จ"));
  }, []);

  if (error) return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>;
  if (!data) return <p className="p-6 text-center text-sm text-slate-500">กำลังโหลดอันดับ...</p>;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">🏆 อันดับห้อง {data.room_name}</h2>
      <ol className="flex flex-col gap-2">
        {data.entries.map((entry) => (
          <li
            key={entry.line_user_id}
            className={`flex items-center gap-3 rounded-2xl p-3 shadow ${entry.is_me ? "bg-sky-100 ring-2 ring-sky-400" : "bg-white"}`}
          >
            <span className="w-8 shrink-0 text-center text-lg font-black text-slate-500">{MEDALS[entry.rank] ?? entry.rank}</span>
            <Avatar src={entry.picture_url} name={entry.display_name} size={36} />
            <span className="min-w-0 flex-1 break-words font-medium">
              {entry.display_name}
              {entry.is_me ? <span className="ml-1 text-xs text-sky-600">(คุณ)</span> : null}
            </span>
            <span className="shrink-0 font-bold text-amber-600">⭐ {entry.total_points}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
