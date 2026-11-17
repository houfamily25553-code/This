import { NextResponse } from "next/server";
import { getRoom, requireAdmin } from "@/lib/server/auth";
import type { RoomDoc } from "@/lib/server/docs";
import { COLLECTIONS, db } from "@/lib/server/firebase-admin";
import { forbidden, notFound, route } from "@/lib/server/http";
import { generateUniqueRoomSecretCode, parseRoomId, roomAdminResponse } from "@/lib/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/room — รหัสห้อง + ข้อความชวนเพื่อน (เฉพาะหัวหน้าห้องของห้องนี้) */
export const GET = route(async (req) => {
  const { user } = await requireAdmin(req);
  const room = await getRoom(user.room_id);
  if (!room) throw notFound("ไม่พบห้องเรียน");
  if (room.admin_line_user_id !== user.line_user_id) throw forbidden();
  return NextResponse.json(roomAdminResponse(room));
});

/** POST /api/admin/room — สร้างรหัสห้องใหม่ (กรณีรหัสหลุด) รหัสเดิมใช้ไม่ได้ทันที สมาชิกเดิมไม่กระทบ */
export const POST = route(async (req) => {
  const { user } = await requireAdmin(req);
  const room_ref = db().collection(COLLECTIONS.rooms).doc(user.room_id);
  const { grade, room_number } = parseRoomId(user.room_id);

  const current = await getRoom(user.room_id);
  if (!current) throw notFound("ไม่พบห้องเรียน");
  const room_secret_code = await generateUniqueRoomSecretCode(grade, room_number, current.room_secret_code);

  const room = await db().runTransaction(async (tx) => {
    const snap = await tx.get(room_ref);
    if (!snap.exists) throw notFound("ไม่พบห้องเรียน");
    const data = snap.data() as RoomDoc;
    if (data.admin_line_user_id !== user.line_user_id) throw forbidden();
    tx.update(room_ref, { room_secret_code });
    return { ...data, room_secret_code };
  });
  return NextResponse.json(roomAdminResponse(room));
});
