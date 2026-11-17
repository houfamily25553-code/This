import { hoursUntil } from "@/lib/time";
import type { StudentTaskDto } from "@/lib/types";

export type TaskTone = "done" | "urgent" | "normal";

const URGENT_HOURS = 24;

/** เขียว = ส่งแล้ว, แดง = เหลือไม่ถึง 24 ชม. หรือเลยกำหนด, ฟ้า = ปกติ */
export function taskTone(task: StudentTaskDto, now: Date = new Date()): TaskTone {
  if (task.submitted) return "done";
  return hoursUntil(task.due_date, now) < URGENT_HOURS ? "urgent" : "normal";
}

export function timeLeftLabel(task: StudentTaskDto, now: Date = new Date()): string {
  const hours = hoursUntil(task.due_date, now);
  if (hours < 0) return "เลยกำหนดแล้ว";
  if (hours < 1) return `เหลือ ${Math.max(1, Math.round(hours * 60))} นาที`;
  if (hours < 48) return `เหลือ ${Math.floor(hours)} ชม.`;
  return `เหลือ ${Math.floor(hours / 24)} วัน`;
}

export const TONE_STYLES: Record<TaskTone, { card: string; badge: string; label: string }> = {
  done: { card: "border-emerald-400 bg-emerald-50", badge: "bg-emerald-500 text-white", label: "ส่งแล้ว ✓" },
  urgent: { card: "border-red-400 bg-red-50", badge: "bg-red-500 text-white", label: "ใกล้หมดเวลา" },
  normal: { card: "border-sky-400 bg-white", badge: "bg-sky-500 text-white", label: "ปกติ" },
};
