import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { authenticate } from "@/lib/server/auth";
import type { RoomDoc, UserDoc } from "@/lib/server/docs";
import { COLLECTIONS, db } from "@/lib/server/firebase-admin";
import { badRequest, conflict, readJson, route, str } from "@/lib/server/http";
import { pushMessage } from "@/lib/server/line";
import { roomRegisteredMessages } from "@/lib/server/line-messages";
import { buildRoomId, buildRoomName } from "@/lib/server/room-code";
import { buildInviteText, generateUniqueRoomSecretCode, roomAdminResponse } from "@/lib/server/rooms";
import type { RegisterResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function intInRange(value: unknown, min: number, max: number, label: string): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
    throw badRequest(`${label} ต้องเป็นตัวเลข ${min}-${max}`);
  }
  return n;
}

/** POST /api/rooms/register — ลงทะเบียนหัวหน้าห้อง (หนึ่งห้องมีหัวหน้าได้คนเดียว) */
export const POST = route(async (req) => {
  const identity = await authenticate(req);
  const body = await readJson(req);
  const display_name = str(body, "display_name", 50);
  const grade = intInRange(body.grade, 1, 6, "ระดับชั้น");
  const room_number = intInRange(body.room_number, 1, 99, "ห้อง");

  const room_id = buildRoomId(grade, room_number);
  const room_secret_code = await generateUniqueRoomSecretCode(grade, room_number);
  const room_ref = db().collection(COLLECTIONS.rooms).doc(room_id);
  const user_ref = db().collection(COLLECTIONS.users).doc(identity.line_user_id);

  const room = await db().runTransaction(async (tx) => {
    const [room_snap, user_snap] = await Promise.all([tx.get(room_ref), tx.get(user_ref)]);
    if (room_snap.exists) throw conflict("ห้องนี้มีหัวหน้าห้องลงทะเบียนแล้ว", "room_taken");
    const existing = user_snap.exists ? (user_snap.data() as UserDoc) : null;
    if (existing?.room_id) throw conflict("คุณอยู่ในห้องเรียนอื่นอยู่ ต้องออกจากห้องเดิมก่อน", "already_in_room");

    const now = Timestamp.now();
    const new_room: RoomDoc = {
      room_id,
      room_name: buildRoomName(grade, room_number),
      room_secret_code,
      admin_line_user_id: identity.line_user_id,
      created_at: now,
    };
    const new_user: UserDoc = {
      line_user_id: identity.line_user_id,
      display_name,
      picture_url: identity.picture_url,
      role: "admin",
      room_id,
      total_points: 0,
      created_at: existing?.created_at ?? now,
    };
    tx.create(room_ref, new_room);
    tx.set(user_ref, new_user);
    return new_room;
  });

  // Push ล้มเหลวได้ถ้ายังไม่ได้เพิ่ม OA เป็นเพื่อน — ไม่ถือว่าลงทะเบียนพลาด หน้าเว็บแสดงรหัสให้อยู่แล้ว
  let push_sent = true;
  try {
    await pushMessage(
      identity.line_user_id,
      roomRegisteredMessages(room.room_name, room.room_secret_code, buildInviteText(room)),
    );
  } catch (err) {
    push_sent = false;
    console.error("[register] push failed", err);
  }

  const response: RegisterResponse = { ...roomAdminResponse(room), push_sent };
  return NextResponse.json(response, { status: 201 });
});
