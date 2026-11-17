import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { parseBangkokLocal } from "@/lib/time";
import { badRequest, str } from "./http";
import { assertOwnImageUrl } from "./storage";

export interface TaskInput {
  subject: string;
  description: string;
  image_url: string;
  due_date: Timestamp;
  notify_at: Timestamp | null;
}

/** รับเวลาได้ทั้ง "2026-11-20T18:00" (ถือเป็นเวลาไทย) และ ISO ที่มี timezone */
function parseDate(value: unknown, label: string): Date {
  if (typeof value !== "string" || !value) throw badRequest(`กรุณาระบุ${label}`);
  const date = parseBangkokLocal(value) ?? new Date(value);
  if (Number.isNaN(date.getTime())) throw badRequest(`${label}ไม่ถูกต้อง`);
  return date;
}

/** ตรวจข้อมูลการบ้านจากฟอร์มแอดมิน — ไม่มี points เพราะแต้มสุ่มที่เซิร์ฟเวอร์เท่านั้น */
export function parseTaskInput(body: Record<string, unknown>, room_id: string): TaskInput {
  const subject = str(body, "subject", 80);
  const description = str(body, "description", 2000, false);
  const image_url = str(body, "image_url", 600, false);
  assertOwnImageUrl(image_url, room_id);

  const due = parseDate(body.due_date, "วันส่ง");
  const has_notify = typeof body.notify_at === "string" && body.notify_at !== "";
  const notify = has_notify ? parseDate(body.notify_at, "เวลาแจ้งเตือน") : null;
  if (notify && notify.getTime() >= due.getTime()) throw badRequest("เวลาแจ้งเตือนต้องอยู่ก่อนวันส่ง");

  return {
    subject,
    description,
    image_url,
    due_date: Timestamp.fromDate(due),
    notify_at: notify ? Timestamp.fromDate(notify) : null,
  };
}
