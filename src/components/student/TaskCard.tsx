"use client";

import { formatBangkok } from "@/lib/time";
import type { StudentTaskDto } from "@/lib/types";
import { taskTone, timeLeftLabel, TONE_STYLES } from "./task-status";

export function TaskCard({ task, onOpen }: { task: StudentTaskDto; onOpen: () => void }) {
  const tone = taskTone(task);
  const style = TONE_STYLES[tone];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3 rounded-2xl border-l-8 p-4 text-left shadow transition active:scale-[0.98] ${style.card}`}
    >
      <div className="min-w-0 flex-1">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${style.badge}`}>
          {tone === "done" ? style.label : tone === "urgent" ? `🔥 ${timeLeftLabel(task)}` : timeLeftLabel(task)}
        </span>
        <h3 className="mt-1 break-words font-bold text-slate-800">{task.subject}</h3>
        <p className="text-xs text-slate-500">ส่ง {formatBangkok(task.due_date)}</p>
        {task.description ? <p className="mt-1 line-clamp-2 break-words text-sm text-slate-600">{task.description}</p> : null}
      </div>
      <div className={`shrink-0 text-center ${tone === "done" ? "opacity-60" : ""}`}>
        <p className="text-2xl font-black text-amber-500">+{task.points}</p>
        <p className="text-xs text-slate-500">แต้ม</p>
      </div>
    </button>
  );
}
