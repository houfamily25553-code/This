import { NextResponse } from "next/server";
import { getRoom, getUser } from "@/lib/server/auth";
import { needRoomMessage, pendingTasksMessage, welcomeMessage } from "@/lib/server/line-messages";
import { replyMessage, verifyLineSignature, type LineMessage } from "@/lib/server/line";
import { listPendingTasks } from "@/lib/server/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { type: string; text?: string };
}

const HOMEWORK_COMMANDS = new Set(["การบ้าน", "งาน", "ดูการบ้าน", "homework"]);

async function getDisplayName(line_user_id: string): Promise<string> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${line_user_id}`, {
      headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return "";
    return ((await res.json()) as { displayName?: string }).displayName ?? "";
  } catch {
    return "";
  }
}

/** คืนข้อความที่จะตอบ (null = ไม่ตอบ) — ใช้ reply เท่านั้น จึงไม่กินโควตาข้อความ */
async function buildReply(event: LineEvent): Promise<LineMessage | null> {
  const line_user_id = event.source?.userId;
  if (!line_user_id || event.source?.type !== "user") return null;

  if (event.type === "follow") {
    return welcomeMessage(await getDisplayName(line_user_id));
  }

  if (event.type === "message" && event.message?.type === "text") {
    const text = (event.message.text ?? "").trim().toLowerCase();
    if (!HOMEWORK_COMMANDS.has(text)) return null;

    const user = await getUser(line_user_id);
    const room = user?.room_id ? await getRoom(user.room_id) : null;
    if (!user || !room) return needRoomMessage();
    return pendingTasksMessage(room.room_name, await listPendingTasks(user));
  }

  return null;
}

async function handleEvent(event: LineEvent): Promise<void> {
  if (!event.replyToken) return;
  const message = await buildReply(event);
  if (message) await replyMessage(event.replyToken, [message]);
}

export async function POST(req: Request): Promise<Response> {
  // ต้องใช้ raw body ตัวเดียวกับที่ LINE เซ็นมา ห้าม parse ก่อนตรวจ
  const raw_body = await req.text();
  if (!verifyLineSignature(raw_body, req.headers.get("x-line-signature"))) {
    return NextResponse.json({ error: { code: "invalid_signature", message: "Invalid signature" } }, { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(raw_body) as { events?: LineEvent[] }).events ?? [];
  } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "Invalid body" } }, { status: 400 });
  }

  // event หนึ่งพังไม่ให้กระทบตัวอื่น และตอบ 200 เสมอเพื่อไม่ให้ LINE ส่งซ้ำ
  const results = await Promise.allSettled(events.map(handleEvent));
  for (const r of results) {
    if (r.status === "rejected") console.error("[line webhook] event failed", r.reason);
  }
  return NextResponse.json({ ok: true });
}
