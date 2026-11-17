"use client";

import type { ApiErrorBody } from "@/lib/types";
import { getIdToken, relogin } from "./liff";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** object จะถูกส่งเป็น JSON, FormData ใช้สำหรับอัปโหลดรูป */
  body?: Record<string, unknown> | FormData;
}

/** เรียก API ของเราโดยแนบ LIFF ID Token ให้เซิร์ฟเวอร์ยืนยันตัวตนเอง */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${await getIdToken()}` };
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(path, { method: options.method ?? "GET", headers, body, cache: "no-store" });
  if (res.status === 401) return relogin();

  const data = (await res.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
  if (!res.ok || !data) {
    throw new ApiClientError(
      res.status,
      data?.error?.code ?? "unknown",
      data?.error?.message ?? "เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่",
    );
  }
  return data;
}
