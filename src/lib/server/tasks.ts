import "server-only";
import { submissionId, type TaskDoc, type UserDoc } from "./docs";
import { COLLECTIONS, db } from "./firebase-admin";

/** งานทั้งหมดของห้อง เรียงตามวันส่ง (ใกล้สุดก่อน) */
export async function listRoomTasks(room_id: string): Promise<TaskDoc[]> {
  const snap = await db().collection(COLLECTIONS.tasks).where("room_id", "==", room_id).get();
  return snap.docs
    .map((d) => d.data() as TaskDoc)
    .sort((a, b) => a.due_date.toMillis() - b.due_date.toMillis());
}

/** task_id ที่ผู้ใช้คนนี้ส่งแล้ว (อ่านตรงจาก doc id `${task_id}_${line_user_id}`) */
export async function getSubmittedTaskIds(task_ids: string[], line_user_id: string): Promise<Set<string>> {
  const submitted = new Set<string>();
  if (task_ids.length === 0) return submitted;
  const refs = task_ids.map((id) => db().collection(COLLECTIONS.submissions).doc(submissionId(id, line_user_id)));
  const snaps = await db().getAll(...refs);
  snaps.forEach((snap, i) => {
    if (snap.exists) submitted.add(task_ids[i]);
  });
  return submitted;
}

const OVERDUE_VISIBLE_MS = 7 * 24 * 3_600_000;

/** งานที่ยังไม่ส่งของผู้ใช้ (รวมงานเลยกำหนดไม่เกิน 7 วัน) */
export async function listPendingTasks(user: UserDoc, now: Date = new Date()): Promise<TaskDoc[]> {
  const cutoff = now.getTime() - OVERDUE_VISIBLE_MS;
  const tasks = (await listRoomTasks(user.room_id)).filter((t) => t.due_date.toMillis() >= cutoff);
  const submitted = await getSubmittedTaskIds(
    tasks.map((t) => t.task_id),
    user.line_user_id,
  );
  return tasks.filter((t) => !submitted.has(t.task_id));
}
