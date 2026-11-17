import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { LineIdentity } from "@/lib/types";
import { requireEnv } from "./env";
import { unauthorized } from "./http";

const LINE_API = "https://api.line.me";
export const MULTICAST_LIMIT = 500;

/** ข้อความ LINE (text / flex) ตามรูปแบบของ Messaging API */
export type LineMessage = Record<string, unknown>;

export class LineApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`LINE API ${status}: ${body}`);
  }
}

// ---------- Webhook signature ----------

/** ตรวจ x-line-signature = base64(HMAC-SHA256(channel secret, raw body)) */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", requireEnv("LINE_CHANNEL_SECRET")).update(rawBody).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// ---------- Messaging API ----------

async function messagingPost(path: string, payload: unknown): Promise<void> {
  const res = await fetch(`${LINE_API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireEnv("LINE_CHANNEL_ACCESS_TOKEN")}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new LineApiError(res.status, await res.text());
}

export function textMessage(text: string): LineMessage {
  return { type: "text", text: text.slice(0, 5000) };
}

/** Reply ไม่กินโควตาข้อความ ใช้ทุกครั้งที่ทำได้ */
export function replyMessage(reply_token: string, messages: LineMessage[]): Promise<void> {
  return messagingPost("/v2/bot/message/reply", { replyToken: reply_token, messages });
}

export function pushMessage(to: string, messages: LineMessage[]): Promise<void> {
  return messagingPost("/v2/bot/message/push", { to, messages });
}

/** Multicast แบ่งส่งครั้งละไม่เกิน 500 คน คืนจำนวนคนที่ส่งถึง */
export async function multicastMessage(line_user_ids: string[], messages: LineMessage[]): Promise<number> {
  const unique = [...new Set(line_user_ids)];
  for (let i = 0; i < unique.length; i += MULTICAST_LIMIT) {
    await messagingPost("/v2/bot/message/multicast", {
      to: unique.slice(i, i + MULTICAST_LIMIT),
      messages,
    });
  }
  return unique.length;
}

// ---------- LINE Login: ตรวจ ID Token ----------

interface VerifiedIdToken {
  sub?: string;
  name?: string;
  picture?: string;
}

/**
 * ส่ง ID Token ให้ LINE ตรวจ (ลายเซ็น, วันหมดอายุ, channel) แล้วคืนตัวตนจริงของผู้ใช้
 * line_user_id มาจาก LINE เท่านั้น ไม่เชื่อค่าที่หน้าเว็บส่งมา
 */
export async function verifyLineIdToken(id_token: string): Promise<LineIdentity> {
  const res = await fetch(`${LINE_API}/oauth2/v2.1/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token, client_id: requireEnv("LINE_LOGIN_CHANNEL_ID") }),
    cache: "no-store",
  });
  if (!res.ok) throw unauthorized();
  const data = (await res.json()) as VerifiedIdToken;
  if (!data.sub) throw unauthorized();
  return {
    line_user_id: data.sub,
    display_name: data.name ?? "",
    picture_url: data.picture ?? "",
  };
}
