import { NextResponse } from "next/server";
import { requireMember } from "@/lib/server/auth";
import type { UserDoc } from "@/lib/server/docs";
import { COLLECTIONS, db } from "@/lib/server/firebase-admin";
import { conflict, route } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/rooms/leave — ออกจากห้อง (เผื่อเข้าผิดห้อง)
 * หัวหน้าห้องออกได้เฉพาะตอนห้องยังว่าง (ไม่มีสมาชิกอื่น ไม่มีงาน) ซึ่งจะลบห้องทิ้งด้วย
 */
export const POST = route(async (req) => {
  const { user } = await requireMember(req);
  const room_id = user.room_id;
  const user_ref = db().collection(COLLECTIONS.users).doc(user.line_user_id);
  const room_ref = db().collection(COLLECTIONS.rooms).doc(room_id);

  if (user.role === "admin") {
    const [members, tasks] = await Promise.all([
      db().collection(COLLECTIONS.users).where("room_id", "==", room_id).limit(2).get(),
      db().collection(COLLECTIONS.tasks).where("room_id", "==", room_id).limit(1).get(),
    ]);
    if (members.size > 1 || !tasks.empty) {
      throw conflict("หัวหน้าห้องออกไม่ได้ เพราะห้องมีสมาชิกหรือการบ้านอยู่แล้ว", "admin_cannot_leave");
    }
  }

  await db().runTransaction(async (tx) => {
    const snap = await tx.get(user_ref);
    const current = snap.exists ? (snap.data() as UserDoc) : null;
    if (!current || current.room_id !== room_id) return; // ออกไปแล้ว
    tx.update(user_ref, { room_id: "", role: "student", total_points: 0 });
    if (current.role === "admin") tx.delete(room_ref);
  });

  return NextResponse.json({ ok: true });
});
