import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { bangkokDateKey } from "@/lib/time";
import { COLLECTIONS, db } from "./firebase-admin";
import { ApiError } from "./http";

export function dailyChatLimit(): number {
  const n = Number(process.env.AI_DAILY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : 20;
}

function usageRef(line_user_id: string) {
  // เอกสารต่อคนต่อวัน (วันตามเวลาไทย) เช่น Uxxxx_2026-11-20
  return db().collection(COLLECTIONS.chat_usage).doc(`${line_user_id}_${bangkokDateKey()}`);
}

/** ใช้โควตา 1 คำถาม (Transaction กันกดรัว) คืนจำนวนที่เหลือของวันนี้ ถ้าเต็มตอบ 429 */
export async function consumeChatQuota(line_user_id: string): Promise<number> {
  const limit = dailyChatLimit();
  const ref = usageRef(line_user_id);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? ((snap.data()?.count as number) ?? 0) : 0;
    if (count >= limit) {
      throw new ApiError(429, "chat_limit_reached", `วันนี้ถามครบ ${limit} คำถามแล้ว พรุ่งนี้มาถามใหม่ได้นะ`);
    }
    tx.set(ref, { line_user_id, date_key: bangkokDateKey(), count: count + 1, updated_at: Timestamp.now() });
    return limit - (count + 1);
  });
}

/** คืนโควตาเมื่อ AI ตอบไม่สำเร็จ */
export async function refundChatQuota(line_user_id: string): Promise<void> {
  try {
    await usageRef(line_user_id).update({ count: FieldValue.increment(-1) });
  } catch (err) {
    console.error("[chat] refund failed", err);
  }
}
