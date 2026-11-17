import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { assertSameRoom, requireAdmin } from "@/lib/server/auth";
import { toTaskDto, type SubmissionDoc, type TaskDoc, type UserDoc } from "@/lib/server/docs";
import { COLLECTIONS, db } from "@/lib/server/firebase-admin";
import { notFound, readJson, route } from "@/lib/server/http";
import { listRoomMembers } from "@/lib/server/rooms";
import { deleteTaskImage } from "@/lib/server/storage";
import { parseTaskInput } from "@/lib/server/task-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ task_id: string }> };

/** โหลดงานและยืนยันว่าเป็นงานของห้องแอดมินคนนี้ */
async function loadOwnTask(user: UserDoc, task_id: string): Promise<TaskDoc> {
  const snap = await db().collection(COLLECTIONS.tasks).doc(task_id).get();
  if (!snap.exists) throw notFound("ไม่พบการบ้านนี้");
  const task = snap.data() as TaskDoc;
  assertSameRoom(user, task.room_id);
  return task;
}

/** PATCH /api/admin/tasks/[task_id] — แก้ไขการบ้าน (แต้มแก้ไม่ได้ เพื่อให้ทุกคนได้เท่ากัน) */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const { user } = await requireAdmin(req);
  const { task_id } = await params;
  const task = await loadOwnTask(user, task_id);
  const input = parseTaskInput(await readJson(req), user.room_id);

  // ถ้าเปลี่ยนเวลาแจ้งเตือน ให้ระบบแจ้งเตือนรอบใหม่ได้
  const notify_changed = (input.notify_at?.toMillis() ?? null) !== (task.notify_at?.toMillis() ?? null);
  const updated: TaskDoc = { ...task, ...input, notified: notify_changed ? false : task.notified };

  await db().collection(COLLECTIONS.tasks).doc(task_id).update({
    subject: updated.subject,
    description: updated.description,
    image_url: updated.image_url,
    due_date: updated.due_date,
    notify_at: updated.notify_at,
    notified: updated.notified,
  });
  if (task.image_url && task.image_url !== updated.image_url) await deleteTaskImage(task.image_url);
  return NextResponse.json({ task: toTaskDto(updated) });
});

/** DELETE /api/admin/tasks/[task_id] — ลบงาน, การส่งของงานนั้น และหักแต้มที่เคยได้คืน */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const { user } = await requireAdmin(req);
  const { task_id } = await params;
  const task = await loadOwnTask(user, task_id);

  const [submissions, members] = await Promise.all([
    db().collection(COLLECTIONS.submissions).where("task_id", "==", task_id).get(),
    listRoomMembers(task.room_id),
  ]);
  const member_ids = new Set(members.map((m) => m.line_user_id));

  // batch ละไม่เกิน 500 writes (submission 1 ใบ = สูงสุด 2 writes)
  const docs = submissions.docs;
  for (let i = 0; i < docs.length; i += 200) {
    const batch = db().batch();
    for (const doc of docs.slice(i, i + 200)) {
      const s = doc.data() as SubmissionDoc;
      batch.delete(doc.ref);
      // คนที่ออกจากห้องไปแล้วแต้มถูกรีเซ็ตแล้ว ไม่ต้องหักซ้ำ
      if (member_ids.has(s.line_user_id)) {
        batch.update(db().collection(COLLECTIONS.users).doc(s.line_user_id), {
          total_points: FieldValue.increment(-s.earned_points),
        });
      }
    }
    await batch.commit();
  }
  await db().collection(COLLECTIONS.tasks).doc(task_id).delete();
  if (task.image_url) await deleteTaskImage(task.image_url);
  return NextResponse.json({ ok: true });
});
