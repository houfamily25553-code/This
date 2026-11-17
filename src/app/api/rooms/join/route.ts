import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { authenticate } from "@/lib/server/auth";
import { toRoomPublicDto, toUserDto, type RoomDoc, type SubmissionDoc, type UserDoc } from "@/lib/server/docs";
import { COLLECTIONS, db } from "@/lib/server/firebase-admin";
import { conflict, notFound, readJson, route, str } from "@/lib/server/http";
import { normalizeRoomSecretCode } from "@/lib/server/room-code";
import { findRoomBySecretCode } from "@/lib/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/rooms/join — นักเรียนกรอกรหัสห้องเพื่อผูก line_user_id กับ room_id */
export const POST = route(async (req) => {
  const identity = await authenticate(req);
  const body = await readJson(req);
  const room_secret_code = normalizeRoomSecretCode(str(body, "room_secret_code", 20));

  const found = await findRoomBySecretCode(room_secret_code);
  if (!found) throw notFound("รหัสห้องไม่ถูกต้อง ลองตรวจอีกครั้งหรือถามหัวหน้าห้อง");

  // ถ้าเคยอยู่ห้องนี้แล้วออกไป แต้มจากงานที่เคยส่งในห้องนี้จะถูกนับคืน (กันแต้มข้ามห้อง)
  const earlier = await db()
    .collection(COLLECTIONS.submissions)
    .where("line_user_id", "==", identity.line_user_id)
    .where("room_id", "==", found.room_id)
    .get();
  const total_points = earlier.docs.reduce((sum, d) => sum + (d.data() as SubmissionDoc).earned_points, 0);

  const room_ref = db().collection(COLLECTIONS.rooms).doc(found.room_id);
  const user_ref = db().collection(COLLECTIONS.users).doc(identity.line_user_id);

  const result = await db().runTransaction(async (tx) => {
    const [room_snap, user_snap] = await Promise.all([tx.get(room_ref), tx.get(user_ref)]);
    const room = room_snap.exists ? (room_snap.data() as RoomDoc) : null;
    // รหัสอาจถูกเปลี่ยนระหว่างทาง ต้องเช็คซ้ำใน transaction
    if (!room || room.room_secret_code !== room_secret_code) throw notFound("รหัสห้องไม่ถูกต้อง");

    const existing = user_snap.exists ? (user_snap.data() as UserDoc) : null;
    if (existing?.room_id) throw conflict("คุณเข้าร่วมห้องเรียนอยู่แล้ว", "already_in_room");

    const user: UserDoc = {
      line_user_id: identity.line_user_id,
      display_name: existing?.display_name || identity.display_name || "นักเรียน",
      picture_url: identity.picture_url,
      role: "student",
      room_id: room.room_id,
      total_points,
      created_at: existing?.created_at ?? Timestamp.now(),
    };
    tx.set(user_ref, user);
    return { user, room };
  });

  return NextResponse.json({ user: toUserDto(result.user), room: toRoomPublicDto(result.room) });
});
