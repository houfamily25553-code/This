import "server-only";
import type { RoomAdminResponse } from "@/lib/types";
import { toRoomAdminDto, type RoomDoc, type UserDoc } from "./docs";
import { liffUrl } from "./env";
import { COLLECTIONS, db } from "./firebase-admin";
import { generateRoomSecretCode } from "./room-code";

/** สุ่มรหัสห้องที่ยังไม่มีห้องใดใช้ (และไม่ซ้ำรหัสเดิมตอนสร้างใหม่) */
export async function generateUniqueRoomSecretCode(grade: number, room_number: number, previous = ""): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomSecretCode(grade, room_number);
    if (code === previous) continue;
    const taken = await db().collection(COLLECTIONS.rooms).where("room_secret_code", "==", code).limit(1).get();
    if (taken.empty) return code;
  }
  throw new Error("ไม่สามารถสร้างรหัสห้องที่ไม่ซ้ำได้");
}

/** room_id "m4-1" -> { grade: 4, room_number: 1 } */
export function parseRoomId(room_id: string): { grade: number; room_number: number } {
  const match = /^m(\d+)-(\d+)$/.exec(room_id);
  if (!match) throw new Error(`room_id ไม่ถูกต้อง: ${room_id}`);
  return { grade: Number(match[1]), room_number: Number(match[2]) };
}

export async function findRoomBySecretCode(room_secret_code: string): Promise<RoomDoc | null> {
  const snap = await db()
    .collection(COLLECTIONS.rooms)
    .where("room_secret_code", "==", room_secret_code)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as RoomDoc);
}

export async function listRoomMembers(room_id: string): Promise<UserDoc[]> {
  const snap = await db().collection(COLLECTIONS.users).where("room_id", "==", room_id).get();
  return snap.docs.map((d) => d.data() as UserDoc);
}

/** ข้อความชวนเพื่อน สำหรับก๊อปปี้ไปวางในกลุ่ม LINE ห้อง */
export function buildInviteText(room: RoomDoc): string {
  return [
    `📚 ห้อง ${room.room_name} ใช้ Homework Quest แล้ว!`,
    "เช็คการบ้าน รับแจ้งเตือน และสะสมแต้มได้ที่นี่",
    "",
    `1) กดลิงก์: ${liffUrl("/join")}`,
    `2) กรอกรหัสห้อง: ${room.room_secret_code}`,
  ].join("\n");
}

export function roomAdminResponse(room: RoomDoc): RoomAdminResponse {
  return { room: toRoomAdminDto(room), join_url: liffUrl("/join"), invite_text: buildInviteText(room) };
}
