import { timingSafeEqual } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getRoom } from "@/lib/server/auth";
import { reminderHeadline } from "@/lib/server/ai";
import type { SubmissionDoc, TaskDoc } from "@/lib/server/docs";
import { COLLECTIONS, db } from "@/lib/server/firebase-admin";
import { route, unauthorized } from "@/lib/server/http";
import { multicastMessage } from "@/lib/server/line";
import { reminderMessage } from "@/lib/server/line-messages";
import { listRoomMembers } from "@/lib/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function assertCronSecret(req: Request): void {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw unauthorized("Unauthorized");
  }
}

/** จองงาน (notified: false -> true) ใน Transaction กัน cron สองรอบส่งซ้ำ คืนเฉพาะงานที่จองได้ */
async function claimTasks(task_ids: string[]): Promise<TaskDoc[]> {
  const refs = task_ids.map((id) => db().collection(COLLECTIONS.tasks).doc(id));
  return db().runTransaction(async (tx) => {
    const claimed: TaskDoc[] = [];
    for (const snap of await tx.getAll(...refs)) {
      const task = snap.exists ? (snap.data() as TaskDoc) : null;
      if (!task || task.notified) continue;
      tx.update(snap.ref, { notified: true });
      claimed.push(task);
    }
    return claimed;
  });
}

async function unclaimTasks(tasks: TaskDoc[]): Promise<void> {
  const batch = db().batch();
  for (const t of tasks) batch.update(db().collection(COLLECTIONS.tasks).doc(t.task_id), { notified: false });
  await batch.commit();
}

/**
 * แจ้งเตือนหนึ่งห้อง โดยส่งให้น้อยที่สุด:
 * - เฉพาะสมาชิกห้องนั้นที่ยังไม่ส่งงาน
 * - งานหลายชิ้นที่ถึงเวลาพร้อมกันรวมเป็นข้อความเดียวต่อคน
 * - คนที่ค้างชุดงานเดียวกันรวมเป็น multicast เดียว
 */
async function notifyRoom(room_id: string, tasks: TaskDoc[], now: Date): Promise<number> {
  const active = tasks
    .filter((t) => t.due_date.toMillis() > now.getTime()) // เลยกำหนดแล้วไม่ต้องเตือน
    .sort((a, b) => a.due_date.toMillis() - b.due_date.toMillis());
  if (active.length === 0) return 0;

  const [room, members] = await Promise.all([getRoom(room_id), listRoomMembers(room_id)]);
  if (!room || members.length === 0) return 0;

  const submitted = new Map<string, Set<string>>();
  await Promise.all(
    active.map(async (task) => {
      const snap = await db().collection(COLLECTIONS.submissions).where("task_id", "==", task.task_id).get();
      submitted.set(task.task_id, new Set(snap.docs.map((d) => (d.data() as SubmissionDoc).line_user_id)));
    }),
  );

  const groups = new Map<string, { tasks: TaskDoc[]; line_user_ids: string[] }>();
  for (const member of members) {
    const pending = active.filter((t) => !submitted.get(t.task_id)?.has(member.line_user_id));
    if (pending.length === 0) continue;
    const key = pending.map((t) => t.task_id).join("|");
    const group = groups.get(key) ?? { tasks: pending, line_user_ids: [] };
    group.line_user_ids.push(member.line_user_id);
    groups.set(key, group);
  }
  if (groups.size === 0) return 0;

  const headline = await reminderHeadline(active);
  let recipients = 0;
  for (const group of groups.values()) {
    recipients += await multicastMessage(group.line_user_ids, [
      reminderMessage(room.room_name, headline, group.tasks, now),
    ]);
  }
  return recipients;
}

/** GET /api/cron/notify — Vercel Cron เรียกทุกชั่วโมง พร้อม Authorization: Bearer <CRON_SECRET> */
export const GET = route(async (req) => {
  assertCronSecret(req);
  const now = new Date();

  const due = await db()
    .collection(COLLECTIONS.tasks)
    .where("notified", "==", false)
    .where("notify_at", "<=", Timestamp.fromDate(now))
    .get();

  const by_room = new Map<string, string[]>();
  for (const doc of due.docs) {
    const task = doc.data() as TaskDoc;
    by_room.set(task.room_id, [...(by_room.get(task.room_id) ?? []), task.task_id]);
  }

  let recipients = 0;
  let notified_tasks = 0;
  const failed_rooms: string[] = [];
  for (const [room_id, task_ids] of by_room) {
    const claimed = await claimTasks(task_ids);
    if (claimed.length === 0) continue;
    try {
      recipients += await notifyRoom(room_id, claimed, now);
      notified_tasks += claimed.length;
    } catch (err) {
      // ส่งไม่สำเร็จ: ปลดจองให้รอบถัดไปลองใหม่
      console.error(`[cron] notify failed for room ${room_id}`, err);
      failed_rooms.push(room_id);
      await unclaimTasks(claimed);
    }
  }

  return NextResponse.json({ ok: failed_rooms.length === 0, due_tasks: due.size, notified_tasks, recipients, failed_rooms });
});
