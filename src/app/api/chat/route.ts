import { NextResponse } from "next/server";
import { assertSameRoom, requireMember } from "@/lib/server/auth";
import { tutorReply } from "@/lib/server/ai";
import { consumeChatQuota, refundChatQuota } from "@/lib/server/chat-quota";
import type { TaskDoc } from "@/lib/server/docs";
import { COLLECTIONS, db } from "@/lib/server/firebase-admin";
import { badRequest, notFound, readJson, route, str } from "@/lib/server/http";
import type { ChatMessageDto, ChatResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_MESSAGE_CHARS = 1000;
const MAX_HISTORY = 9; // เลขคี่ เพื่อให้ประวัติที่ตัดแล้วยังขึ้นต้นด้วยข้อความของนักเรียน

function parseMessages(raw: unknown): ChatMessageDto[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 40) throw badRequest("ข้อความไม่ถูกต้อง");
  const messages = raw.map((item, i): ChatMessageDto => {
    const m = item as Partial<ChatMessageDto> | null;
    const expected = i % 2 === 0 ? "user" : "assistant";
    const content = typeof m?.content === "string" ? m.content.trim() : "";
    if (m?.role !== expected || !content) throw badRequest("ข้อความไม่ถูกต้อง");
    if (m.role === "user" && content.length > MAX_MESSAGE_CHARS) {
      throw badRequest(`คำถามยาวเกิน ${MAX_MESSAGE_CHARS} ตัวอักษร`);
    }
    return { role: expected, content: content.slice(0, 6000) };
  });
  if (messages[messages.length - 1].role !== "user") throw badRequest("ข้อความสุดท้ายต้องเป็นคำถาม");
  return messages.slice(-MAX_HISTORY);
}

/** POST /api/chat — AI ผู้ช่วยของการบ้านหนึ่งชิ้น (ตอบเป็น JSON, เรียก Gemini ฝั่งเซิร์ฟเวอร์เท่านั้น) */
export const POST = route(async (req) => {
  const { user } = await requireMember(req);
  const body = await readJson(req);
  const task_id = str(body, "task_id", 100);
  const messages = parseMessages(body.messages);

  const snap = await db().collection(COLLECTIONS.tasks).doc(task_id).get();
  if (!snap.exists) throw notFound("ไม่พบการบ้านนี้");
  const task = snap.data() as TaskDoc;
  assertSameRoom(user, task.room_id);

  const remaining_today = await consumeChatQuota(user.line_user_id);
  let reply: string;
  try {
    reply = await tutorReply(task, messages);
  } catch (err) {
    await refundChatQuota(user.line_user_id);
    throw err;
  }

  const response: ChatResponse = { reply, remaining_today };
  return NextResponse.json(response, { headers: { "Content-Type": "application/json; charset=utf-8" } });
});
