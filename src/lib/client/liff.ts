"use client";

import type { Liff } from "@line/liff";

let liff_promise: Promise<Liff> | null = null;

/** init LIFF ครั้งเดียว ถ้ายังไม่ login จะพาไปหน้า LINE Login แล้วกลับมาหน้าเดิม */
export function getLiff(): Promise<Liff> {
  if (!liff_promise) {
    liff_promise = (async () => {
      const liff_id = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liff_id) throw new Error("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LIFF_ID");
      const { default: liff } = await import("@line/liff");
      await liff.init({ liffId: liff_id });
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return new Promise<Liff>(() => {}); // กำลัง redirect ไม่ต้องทำต่อ
      }
      return liff;
    })();
    liff_promise.catch(() => {
      liff_promise = null;
    });
  }
  return liff_promise;
}

/** บังคับ login ใหม่ (ใช้เมื่อ ID Token หมดอายุ) */
export async function relogin(): Promise<never> {
  const liff = await getLiff();
  if (liff.isInClient()) {
    // ในแอป LINE ต้องเปิด LIFF ใหม่จึงจะได้ token ใหม่
    throw new Error("เซสชันหมดอายุ กรุณาปิดหน้านี้แล้วเปิดใหม่จากเมนู LINE");
  }
  liff.logout();
  liff.login({ redirectUri: window.location.href });
  return new Promise<never>(() => {});
}

/** คืน ID Token ที่ยังไม่หมดอายุ สำหรับแนบไปกับทุก API */
export async function getIdToken(): Promise<string> {
  const liff = await getLiff();
  const token = liff.getIDToken();
  const exp = liff.getDecodedIDToken()?.exp ?? 0;
  if (!token || exp * 1000 < Date.now() + 30_000) return relogin();
  return token;
}
