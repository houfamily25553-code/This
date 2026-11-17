import { NextResponse } from "next/server";
import { requireMember } from "@/lib/server/auth";
import { submissionId, toTaskDto, type SubmissionDoc } from "@/lib/server/docs";
import { COLLECTIONS, db } from "@/lib/server/firebase-admin";
import { route } from "@/lib/server/http";
import { listRoomTasks } from "@/lib/server/tasks";
import type { StudentTasksResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/student/tasks — ฟีดการบ้านของห้องตัวเอง พร้อมสถานะส่งของตัวเอง */
export const GET = route(async (req) => {
  const { user } = await requireMember(req);
  const tasks = await listRoomTasks(user.room_id);

  const submitted_at = new Map<string, string>();
  if (tasks.length > 0) {
    const refs = tasks.map((t) =>
      db().collection(COLLECTIONS.submissions).doc(submissionId(t.task_id, user.line_user_id)),
    );
    for (const snap of await db().getAll(...refs)) {
      if (!snap.exists) continue;
      const s = snap.data() as SubmissionDoc;
      submitted_at.set(s.task_id, s.submitted_at.toDate().toISOString());
    }
  }

  const body: StudentTasksResponse = {
    tasks: tasks.map((t) => ({
      ...toTaskDto(t),
      submitted: submitted_at.has(t.task_id),
      submitted_at: submitted_at.get(t.task_id) ?? null,
    })),
    total_points: user.total_points,
  };
  return NextResponse.json(body);
});
