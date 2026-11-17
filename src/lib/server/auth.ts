import "server-only";
import type { LineIdentity } from "@/lib/types";
import type { RoomDoc, UserDoc } from "./docs";
import { COLLECTIONS, db } from "./firebase-admin";
import { forbidden, unauthorized } from "./http";
import { verifyLineIdToken } from "./line";

export interface MemberContext {
  identity: LineIdentity;
  user: UserDoc; // room_id ไม่ว่างแน่นอน
}

/** ทุก API เรียกตัวนี้ก่อน: อ่าน `Authorization: Bearer <LIFF ID Token>` แล้วให้ LINE ยืนยัน */
export async function authenticate(req: Request): Promise<LineIdentity> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw unauthorized();
  return verifyLineIdToken(match[1].trim());
}

export async function getUser(line_user_id: string): Promise<UserDoc | null> {
  const snap = await db().collection(COLLECTIONS.users).doc(line_user_id).get();
  return snap.exists ? (snap.data() as UserDoc) : null;
}

export async function getRoom(room_id: string): Promise<RoomDoc | null> {
  if (!room_id) return null;
  const snap = await db().collection(COLLECTIONS.rooms).doc(room_id).get();
  return snap.exists ? (snap.data() as RoomDoc) : null;
}

/** ต้องเป็นสมาชิกห้อง (นักเรียนหรือหัวหน้าห้อง) — ใช้ room_id จากฐานข้อมูลเท่านั้น */
export async function requireMember(req: Request): Promise<MemberContext> {
  const identity = await authenticate(req);
  const user = await getUser(identity.line_user_id);
  if (!user || !user.room_id) throw forbidden("คุณยังไม่ได้เข้าร่วมห้องเรียน");
  return { identity, user };
}

/** ต้องเป็นหัวหน้าห้อง และจัดการได้เฉพาะห้อง user.room_id ของตัวเอง */
export async function requireAdmin(req: Request): Promise<MemberContext> {
  const ctx = await requireMember(req);
  if (ctx.user.role !== "admin") throw forbidden("เฉพาะหัวหน้าห้องเท่านั้น");
  return ctx;
}

/** ใช้เช็คว่าเอกสาร (งาน/การส่ง) เป็นของห้องผู้ใช้จริง */
export function assertSameRoom(user: UserDoc, room_id: string): void {
  if (!user.room_id || user.room_id !== room_id) throw forbidden("ข้อมูลนี้ไม่ใช่ของห้องคุณ");
}
