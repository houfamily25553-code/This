import "server-only";
import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/lib/types";

/** error ที่ตั้งใจส่งกลับให้หน้าเว็บ พร้อม HTTP status */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code = "bad_request") => new ApiError(400, code, message);
export const unauthorized = (message = "กรุณาเข้าสู่ระบบด้วย LINE ใหม่อีกครั้ง") =>
  new ApiError(401, "unauthorized", message);
export const forbidden = (message = "คุณไม่มีสิทธิ์ทำรายการนี้") => new ApiError(403, "forbidden", message);
export const notFound = (message = "ไม่พบข้อมูล") => new ApiError(404, "not_found", message);
export const conflict = (message: string, code = "conflict") => new ApiError(409, code, message);

export function errorResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  console.error("[api] unexpected error", err);
  return NextResponse.json(
    { error: { code: "internal_error", message: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง" } },
    { status: 500 },
  );
}

/** ครอบ route handler: แปลง ApiError เป็น JSON และกัน error หลุด */
export function route<C>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** อ่าน JSON body เป็น object ถ้าไม่ใช่ให้ตอบ 400 */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("รูปแบบข้อมูลไม่ถูกต้อง");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw badRequest("รูปแบบข้อมูลไม่ถูกต้อง");
  return body as Record<string, unknown>;
}

/** ดึง string จาก body พร้อมตัดช่องว่างและจำกัดความยาว */
export function str(body: Record<string, unknown>, key: string, max: number, required = true): string {
  const raw = body[key];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value && required) throw badRequest(`กรุณากรอก ${key}`);
  if (value.length > max) throw badRequest(`${key} ยาวเกิน ${max} ตัวอักษร`);
  return value;
}
