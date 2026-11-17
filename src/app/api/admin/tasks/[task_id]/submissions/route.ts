import { NextResponse } from "next/server";
import { assertSameRoom, requireAdmin } from "@/lib/server/auth";
import type { SubmissionDoc, TaskDoc } from "@/lib/server/docs";
import { COLLECTIONS, db } from "@/lib/server/firebase-admin";
import { notFound, route } from "@/lib/server/http";
import { listRoomMembers } from "@/lib/server/rooms";
import type { TaskSubmissionsResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ task_id: string }> };

/** GET /api/admin/tasks/[task_id]/submissions — ใครส่งแล้ว / ยังไม่ส่ง */
export const GET = route<Ctx>(async (req, { params }) => {
  const { user } = await requireAdmin(req);
  const { task_id } = await params;

  const task_snap = await db().collection(COLLECTIONS.tasks).doc(task_id).get();
  if (!task_snap.exists) throw notFound("ไม่พบการบ้านนี้");
  assertSameRoom(user, (task_snap.data() as TaskDoc).room_id);

  const [members, submissions] = await Promise.all([
    listRoomMembers(user.room_id),
    db().collection(COLLECTIONS.submissions).where("task_id", "==", task_id).get(),
  ]);
  const submitted_at = new Map<string, string>();
  for (const doc of submissions.docs) {
    const s = doc.data() as SubmissionDoc;
    submitted_at.set(s.line_user_id, s.submitted_at.toDate().toISOString());
  }

  const body: TaskSubmissionsResponse = {
    task_id,
    members: members
      .map((m) => ({
        line_user_id: m.line_user_id,
        display_name: m.display_name,
        picture_url: m.picture_url,
        role: m.role,
        submitted: submitted_at.has(m.line_user_id),
        submitted_at: submitted_at.get(m.line_user_id) ?? null,
      }))
      // ยังไม่ส่งขึ้นก่อน แล้วเรียงตามชื่อ
      .sort((a, b) => Number(a.submitted) - Number(b.submitted) || a.display_name.localeCompare(b.display_name, "th")),
  };
  return NextResponse.json(body);
});
