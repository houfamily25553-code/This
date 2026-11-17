"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { LoadingScreen, MessageScreen } from "@/components/ScreenState";
import { useSession } from "@/components/SessionProvider";
import { Leaderboard } from "@/components/student/Leaderboard";
import { PointsCelebration } from "@/components/student/PointsCelebration";
import { TaskCard } from "@/components/student/TaskCard";
import { TaskDetailSheet } from "@/components/student/TaskDetailSheet";
import { api } from "@/lib/client/api";
import type { StudentTaskDto, StudentTasksResponse, SubmitResponse } from "@/lib/types";

type Tab = "tasks" | "leaderboard";

export default function StudentPage() {
  const router = useRouter();
  const { status, me, error: session_error } = useSession();
  const has_room = Boolean(me?.user?.room_id);

  const [tab, setTab] = useState<Tab>("tasks");
  const [tasks, setTasks] = useState<StudentTaskDto[] | null>(null);
  const [total_points, setTotalPoints] = useState(0);
  const [error, setError] = useState("");
  const [open_task_id, setOpenTaskId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<SubmitResponse | null>(null);
  const [leaderboard_version, setLeaderboardVersion] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api<StudentTasksResponse>("/api/student/tasks");
      setTasks(data.tasks);
      setTotalPoints(data.total_points);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดการบ้านไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    if (has_room) void load();
    else router.replace("/join");
  }, [status, has_room, load, router]);

  // เรียงตามวันส่ง: งานที่ยังไม่ส่งขึ้นก่อน (ใกล้กำหนดสุดอยู่บน) งานที่ส่งแล้วอยู่ล่าง
  const { pending, done } = useMemo(() => {
    const sorted = [...(tasks ?? [])].sort((a, b) => a.due_date.localeCompare(b.due_date));
    return { pending: sorted.filter((t) => !t.submitted), done: sorted.filter((t) => t.submitted).reverse() };
  }, [tasks]);
  const open_task = tasks?.find((t) => t.task_id === open_task_id) ?? null;

  function onSubmitted(result: SubmitResponse) {
    setTasks((current) =>
      (current ?? []).map((t) =>
        t.task_id === result.submission.task_id ? { ...t, submitted: true, submitted_at: result.submission.submitted_at } : t,
      ),
    );
    setTotalPoints(result.total_points);
    setOpenTaskId(null);
    setCelebration(result);
    setLeaderboardVersion((v) => v + 1);
  }
  const closeCelebration = useCallback(() => setCelebration(null), []);

  if (status === "loading") return <LoadingScreen label="กำลังเข้าสู่ระบบด้วย LINE..." />;
  if (status === "error") return <MessageScreen title="เข้าสู่ระบบไม่สำเร็จ" detail={session_error} />;
  if (!has_room || !me?.user) return <LoadingScreen />;

  return (
    <main className="flex min-h-dvh flex-col pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-sky-500 p-4 text-white shadow">
        <Link href="/profile" aria-label="โปรไฟล์" className="shrink-0">
          <Avatar src={me.user.picture_url} name={me.user.display_name} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{me.user.display_name}</p>
          <p className="text-xs text-sky-100">ห้อง {me.room?.room_name}</p>
        </div>
        <div className="shrink-0 rounded-full bg-white/20 px-4 py-1 text-right">
          <p className="text-lg font-black leading-tight">⭐ {total_points}</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 p-4">
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}

        {tab === "tasks" ? (
          <>
            {!tasks ? <p className="p-6 text-center text-sm text-slate-500">กำลังโหลดภารกิจ...</p> : null}
            {tasks && tasks.length === 0 ? (
              <p className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow">ยังไม่มีการบ้าน 🎈</p>
            ) : null}

            {tasks && tasks.length > 0 ? (
              <h2 className="font-semibold">ภารกิจที่ต้องทำ ({pending.length})</h2>
            ) : null}
            {tasks && tasks.length > 0 && pending.length === 0 ? (
              <p className="rounded-2xl bg-emerald-50 p-6 text-center font-medium text-emerald-700">🎉 เคลียร์ทุกภารกิจแล้ว!</p>
            ) : null}
            {pending.map((task) => (
              <TaskCard key={task.task_id} task={task} onOpen={() => setOpenTaskId(task.task_id)} />
            ))}

            {done.length > 0 ? <h2 className="mt-2 font-semibold text-slate-500">ส่งแล้ว ({done.length})</h2> : null}
            {done.map((task) => (
              <TaskCard key={task.task_id} task={task} onOpen={() => setOpenTaskId(task.task_id)} />
            ))}

            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
              <span>🟥 ใกล้หมดเวลา</span>
              <span>🟦 ปกติ</span>
              <span>🟩 ส่งแล้ว</span>
            </div>
          </>
        ) : (
          <Leaderboard key={leaderboard_version} />
        )}

        {me.user.role === "admin" ? (
          <Link href="/admin" className="rounded-2xl bg-white p-3 text-center text-sm font-semibold text-sky-600 shadow">
            👑 ไปหน้าจัดการการบ้าน
          </Link>
        ) : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-md grid-cols-2 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        {(
          [
            { id: "tasks", label: "📚 ภารกิจ" },
            { id: "leaderboard", label: "🏆 อันดับ" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? "page" : undefined}
            className={`p-4 text-sm font-semibold ${tab === item.id ? "text-sky-600" : "text-slate-400"}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {open_task ? <TaskDetailSheet task={open_task} onClose={() => setOpenTaskId(null)} onSubmitted={onSubmitted} /> : null}
      {celebration ? (
        <PointsCelebration
          earned_points={celebration.earned_points}
          total_points={celebration.total_points}
          onDone={closeCelebration}
        />
      ) : null}
    </main>
  );
}
