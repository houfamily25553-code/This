"use client";

import { useState } from "react";
import { api } from "@/lib/client/api";
import { formatBangkok } from "@/lib/time";
import type { StudentTaskDto, SubmitResponse } from "@/lib/types";
import { ChatPanel } from "./ChatPanel";
import { taskTone, timeLeftLabel, TONE_STYLES } from "./task-status";

interface Props {
  task: StudentTaskDto;
  onClose: () => void;
  onSubmitted: (result: SubmitResponse) => void;
}

/** รายละเอียดงาน + รูปขยายใหญ่ + ปุ่ม "ทำเสร็จแล้ว" + AI ผู้ช่วย */
export function TaskDetailSheet({ task, onClose, onSubmitted }: Props) {
  const [zoomed, setZoomed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [show_chat, setShowChat] = useState(false);
  const [error, setError] = useState("");
  const tone = taskTone(task);

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      onSubmitted(await api<SubmitResponse>(`/api/student/tasks/${task.task_id}/submit`, { method: "POST" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่งงานไม่สำเร็จ");
      setSubmitting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={task.subject}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-3xl bg-slate-50 p-5 animate-sheet-up"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${TONE_STYLES[tone].badge}`}>
              {tone === "done" ? TONE_STYLES.done.label : timeLeftLabel(task)}
            </span>
            <h2 className="mt-1 break-words text-xl font-bold">{task.subject}</h2>
            <p className="text-sm text-slate-500">ส่ง {formatBangkok(task.due_date)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="h-9 w-9 shrink-0 rounded-full bg-slate-200 text-lg">
            ×
          </button>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-amber-50 p-3">
          <span className="text-sm font-medium text-amber-800">รางวัลภารกิจ</span>
          <span className="text-2xl font-black text-amber-500">+{task.points} แต้ม</span>
        </div>

        {task.description ? (
          <p className="whitespace-pre-wrap break-words rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm">{task.description}</p>
        ) : null}

        {task.image_url ? (
          <button type="button" onClick={() => setZoomed(true)} className="relative overflow-hidden rounded-2xl bg-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={task.image_url} alt={`รูปประกอบ ${task.subject}`} className="max-h-64 w-full object-contain" />
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">🔍 แตะเพื่อขยาย</span>
          </button>
        ) : null}

        {show_chat ? (
          <ChatPanel task_id={task.task_id} subject={task.subject} />
        ) : (
          <button
            type="button"
            onClick={() => setShowChat(true)}
            className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm font-semibold text-violet-700"
          >
            🤖 ไม่เข้าใจ? ถามพี่ติว AI
          </button>
        )}

        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}

        {task.submitted ? (
          <p className="rounded-2xl bg-emerald-100 p-4 text-center font-semibold text-emerald-700">
            ส่งแล้ว ✓{task.submitted_at ? ` เมื่อ ${formatBangkok(task.submitted_at)}` : ""}
          </p>
        ) : confirming ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="rounded-2xl bg-slate-200 p-4 font-medium">
              ยังไม่เสร็จ
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="rounded-2xl bg-emerald-500 p-4 font-semibold text-white shadow disabled:opacity-50"
            >
              {submitting ? "กำลังส่ง..." : "ยืนยัน เสร็จแล้ว!"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-2xl bg-emerald-500 p-4 text-lg font-bold text-white shadow-lg active:bg-emerald-600"
          >
            ✅ ทำเสร็จแล้ว
          </button>
        )}
      </div>

      {zoomed ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setZoomed(false);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={task.image_url} alt={`รูปประกอบ ${task.subject}`} className="max-w-none touch-pinch-zoom" style={{ width: "100%" }} />
          <span className="fixed right-4 top-4 rounded-full bg-white/20 px-4 py-2 text-sm text-white">แตะเพื่อปิด</span>
        </div>
      ) : null}
    </div>
  );
}
