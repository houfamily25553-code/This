import "server-only";
import { randomInt } from "node:crypto";

// ตัดตัวที่สับสนง่ายออก: 0/O และ 1/I/L
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const RANDOM_LENGTH = 4;

/** ม.4 ห้อง 1 -> room_id "m4-1" (ใช้เป็น doc id ทำให้หนึ่งห้องมีได้ห้องเดียว) */
export function buildRoomId(grade: number, room_number: number): string {
  return `m${grade}-${room_number}`;
}

export function buildRoomName(grade: number, room_number: number): string {
  return `ม.${grade}/${room_number}`;
}

/** ม.4 ห้อง 1 -> "401-K7XP" (ส่วนสุ่มสร้างด้วย crypto ฝั่งเซิร์ฟเวอร์) */
export function generateRoomSecretCode(grade: number, room_number: number): string {
  let random = "";
  for (let i = 0; i < RANDOM_LENGTH; i++) random += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${grade}${String(room_number).padStart(2, "0")}-${random}`;
}

/** จัดรูปรหัสที่นักเรียนพิมพ์มา: ตัดช่องว่าง, ตัวพิมพ์ใหญ่, เติมขีดให้ */
export function normalizeRoomSecretCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length <= RANDOM_LENGTH) return cleaned;
  return `${cleaned.slice(0, -RANDOM_LENGTH)}-${cleaned.slice(-RANDOM_LENGTH)}`;
}
