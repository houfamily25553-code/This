import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { authenticate } from "@/lib/server/auth";
import { submissionId, toSubmissionDto, type SubmissionDoc, type TaskDoc, type UserDoc } from "@/lib/server/docs";
import { COLLECTIONS, db } from "@/lib/server/firebase-admin";
import { conflict, forbidden, notFound, route } from "@/lib/server/http";
import type { SubmitResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ task_id: string }> };

/**
 * POST /api/student/tasks/[task_id]/submit — กด "ทำเสร็จแล้ว"
 * ทุกอย่างอยู่ใน Transaction เดียว: เช็คห้อง, กันส่งซ้ำ, สร้าง Submission, บวก total_points
 * แต้มที่ได้ = task.points เสมอ (สุ่มไว้ตอนสร้างงาน) ไม่รับตัวเลขใดจากหน้าเว็บ
 */
export const POST = route<Ctx>(async (req, { params }) => {
  const identity = await authenticate(req);
  const { task_id } = await params;

  const user_ref = db().collection(COLLECTIONS.users).doc(identity.line_user_id);
  const task_ref = db().collection(COLLECTIONS.tasks).doc(task_id);
  const submission_ref = db().collection(COLLECTIONS.submissions).doc(submissionId(task_id, identity.line_user_id));

  const result = await db().runTransaction(async (tx) => {
    const [user_snap, task_snap, submission_snap] = await tx.getAll(user_ref, task_ref, submission_ref);

    const user = user_snap.exists ? (user_snap.data() as UserDoc) : null;
    if (!user || !user.room_id) throw forbidden("คุณยังไม่ได้เข้าร่วมห้องเรียน");

    const task = task_snap.exists ? (task_snap.data() as TaskDoc) : null;
    if (!task) throw notFound("ไม่พบการบ้านนี้");
    if (task.room_id !== user.room_id) throw forbidden("งานนี้ไม่ใช่ของห้องคุณ");

    if (submission_snap.exists) throw conflict("คุณส่งงานนี้ไปแล้ว", "already_submitted");

    const submission: SubmissionDoc = {
      task_id,
      line_user_id: user.line_user_id,
      room_id: user.room_id,
      status: "submitted",
      earned_points: task.points,
      submitted_at: Timestamp.now(),
    };
    tx.create(submission_ref, submission);
    tx.update(user_ref, { total_points: FieldValue.increment(task.points) });
    return { submission, total_points: user.total_points + task.points };
  });

  const body: SubmitResponse = {
    submission: toSubmissionDto(result.submission),
    earned_points: result.submission.earned_points,
    total_points: result.total_points,
  };
  return NextResponse.json(body, { status: 201 });
});
