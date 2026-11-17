"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RoomCodeCard } from "@/components/admin/RoomCodeCard";
import { SubmissionTable } from "@/components/admin/SubmissionTable";
import { TaskForm } from "@/components/admin/TaskForm";
import { LoadingScreen, MessageScreen } from "@/components/ScreenState";
import { useSession } from "@/components/SessionProvider";
import { api } from "@/lib/client/api";
import { formatBangkok } from "@/lib/time";
import type { AdminTaskDto, AdminTasksResponse } from "@/lib/types";

export default function AdminPage() {
  const router = useRouter();
  const { status, me, error: session_error } = useSession();
  const is_admin = me?.user?.role === "admin" && Boolean(me.user.room_id);

  const [data, setData] = useState<AdminTasksResponse | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<{ task: AdminTaskDto | null } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy_delete, setBusyDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<AdminTasksResponse>("/api/admin/tasks"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    if (is_admin) void load();
    else if (!me?.user?.room_id) router.replace("/liff/register");
  }, [status, is_admin, me?.user?.room_id, load, router]);

  async function remove(task_id: string) {
    setBusyDelete(true);
    try {
      await api(`/api/admin/tasks/${task_id}`, { method: "DELETE" });
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setBusyDelete(false);
    }
  }

  if (status === "loading") return <LoadingScreen label="กำลังเข้าสู่ระบบด้วย LINE..." />;
  if (status === "error") return <MessageScreen title="เข้าสู่ระบบไม่สำเร็จ" detail={session_error} />;
  if (!is_admin) {
    if (!me?.user?.room_id) return <LoadingScreen />;
    return (
      <MessageScreen title="หน้านี้สำหรับหัวหน้าห้อง" detail="บัญชีของคุณเป็นนักเรียน">
        <Link href="/student" className="mt-2 rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-white">
          ไปหน้าการบ้าน
        </Link>
      </MessageScreen>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col gap-4 p-4 pb-28">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">จัดการการบ้าน</h1>
          <p className="text-sm text-slate-500">
            ห้อง {me?.room?.room_name} · สมาชิก {data?.member_count ?? "-"} คน
          </p>
        </div>
        <Link href="/student" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-sky-600 shadow">
          มุมมองนักเรียน
        </Link>
      </header>

      <RoomCodeCard />

      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">การบ้านทั้งหมด ({data?.tasks.length ?? 0})</h2>
        {!data ? <p className="text-sm text-slate-500">กำลังโหลด...</p> : null}
        {data && data.tasks.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow">ยังไม่มีการบ้าน กดปุ่มด้านล่างเพื่อสร้างงานแรก</p>
        ) : null}

        {data?.tasks.map((task) => {
          const open = expanded === task.task_id;
          const overdue = new Date(task.due_date).getTime() < Date.now();
          return (
            <article key={task.task_id} className="rounded-2xl bg-white p-4 shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold break-words">{task.subject}</h3>
                  <p className={`text-xs ${overdue ? "text-slate-400" : "text-slate-500"}`}>
                    {overdue ? "เลยกำหนด " : "ส่ง "}
                    {formatBangkok(task.due_date)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {task.notify_at
                      ? `🔔 ${formatBangkok(task.notify_at)}${task.notified ? " (แจ้งแล้ว)" : ""}`
                      : "🔕 ไม่ได้ตั้งแจ้งเตือน"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">+{task.points}</span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : task.task_id)}
                  aria-expanded={open}
                  className="flex-1 rounded-xl bg-slate-100 p-2 font-medium"
                >
                  ส่งแล้ว {task.submitted_count}/{data.member_count} {open ? "▲" : "▼"}
                </button>
                <button type="button" onClick={() => setForm({ task })} className="rounded-xl bg-sky-100 p-2 px-3 font-medium text-sky-700">
                  แก้ไข
                </button>
                <button type="button" onClick={() => setDeleting(task.task_id)} className="rounded-xl bg-red-100 p-2 px-3 font-medium text-red-700">
                  ลบ
                </button>
              </div>

              {deleting === task.task_id ? (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                  <p>ลบงานนี้? แต้มที่เพื่อนได้จากงานนี้จะถูกหักคืนด้วย</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setDeleting(null)} className="rounded-lg bg-white p-2 font-medium">
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(task.task_id)}
                      disabled={busy_delete}
                      className="rounded-lg bg-red-500 p-2 font-semibold text-white disabled:opacity-50"
                    >
                      {busy_delete ? "กำลังลบ..." : "ยืนยันลบ"}
                    </button>
                  </div>
                </div>
              ) : null}

              {open ? (
                <div className="mt-3 border-t border-slate-100 pt-2">
                  <SubmissionTable task_id={task.task_id} />
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md bg-gradient-to-t from-slate-50 via-slate-50 p-4">
        <button
          type="button"
          onClick={() => setForm({ task: null })}
          className="w-full rounded-2xl bg-sky-500 p-4 font-semibold text-white shadow-lg active:bg-sky-600"
        >
          + สร้างการบ้านใหม่
        </button>
      </div>

      {form ? (
        <TaskForm
          key={form.task?.task_id ?? "new"}
          task={form.task}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            void load();
          }}
        />
      ) : null}
    </main>
  );
}
