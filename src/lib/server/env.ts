import "server-only";

/** อ่าน Environment Variable ที่จำเป็น ถ้าไม่มีให้ error ชัดเจน */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function appUrl(): string {
  return requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/+$/, "");
}

/** ลิงก์ LIFF ไปยัง path ในแอป เช่น liffUrl("/join") */
export function liffUrl(path = ""): string {
  return `https://liff.line.me/${requireEnv("NEXT_PUBLIC_LIFF_ID")}${path}`;
}
