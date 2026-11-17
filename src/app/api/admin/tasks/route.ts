import { randomInt } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { toTaskDto, type SubmissionDoc, type TaskDoc } from "@/lib/server/docs";
import { COLLECTIONS, db } from "@/lib/server/firebase-admin";
import { readJson, route } from "@/lib/server/http";
import { listRoomMembers } from "@/lib/server/rooms";
import { parseTaskInput } from "@/lib/server/task-input";
import { listRoomTasks } from "@/lib/server/tasks";
import type { AdminTasksResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_POINTS = 10;
const MAX_POINTS = 100;

/** GET /api/admin/tasks — งานทั้งหมดของห้องตัวเอง + จำนวนคนส่งแล้ว */
export const GET = route(async (req) => {
  const { user } = await requireAdmin(req);
  const [tasks, members, submissions] = await Promise.all([
    listRoomTasks(user.room_id),
    listRoomMembers(user.room_id),
    db().collection(COLLECTIONS.submissions).where("room_id", "==", user.room_id).get(),
  ]);

  // นับเฉพาะคนที่ยังอยู่ในห้อง ให้ตรงกับตารางรายคน
  const member_ids = new Set(members.map((m) => m.line_user_id));
  const counts = new Map<string, number>();
  for (const doc of submissions.docs) {
    const s = doc.data() as SubmissionDoc;
    if (member_ids.has(s.line_user_id)) counts.set(s.task_id, (counts.get(s.task_id) ?? 0) + 1);
  }

  const body: AdminTasksResponse = {
    tasks: tasks.map((t) => ({ ...toTaskDto(t), submitted_count: counts.get(t.task_id) ?? 0 })),
    member_count: members.length,
  };
  return NextResponse.json(body);
});

/** POST /api/admin/tasks — สร้างการบ้าน และสุ่มแต้ม "ครั้งเดียว" ที่นี่ (10-100) */
export const POST = route(async (req) => {
  const { user } = await requireAdmin(req);
  const input = parseTaskInput(await readJson(req), user.room_id);

  const ref = db().collection(COLLECTIONS.tasks).doc();
  const task: TaskDoc = {
    task_id: ref.id,
    room_id: user.room_id, // มาจากฐานข้อมูล ไม่รับจากหน้าเว็บ
    ...input,
    points: randomInt(MIN_POINTS, MAX_POINTS + 1),
    notified: false,
    created_by: user.line_user_id,
    created_at: Timestamp.now(),
  };
  await ref.create(task);
  return NextResponse.json({ task: toTaskDto(task) }, { status: 201 });
});
