// ตัวช่วยเรื่องเวลา ใช้เขตเวลา Asia/Bangkok (UTC+7 ไม่มี DST) ทั้งระบบ
// ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์

export const BANGKOK_TZ = "Asia/Bangkok";
const BANGKOK_OFFSET = "+07:00";

function parts(date: Date): Record<string, string> {
  const out: Record<string, string> = {};
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return out;
}

/** "2026-11-20" ตามเวลาไทย (ใช้เป็น key ของ rate limit รายวัน) */
export function bangkokDateKey(date: Date = new Date()): string {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** แปลงค่าจาก <input type="datetime-local"> ("2026-11-20T18:00") ที่ถือเป็นเวลาไทย -> Date */
export function parseBangkokLocal(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const d = new Date(`${value}${BANGKOK_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date/ISO -> ค่าสำหรับ <input type="datetime-local"> ตามเวลาไทย */
export function toBangkokLocalInput(value: Date | string): string {
  const p = parts(typeof value === "string" ? new Date(value) : value);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** เช่น "ศ. 20 พ.ย. 18:00 น." */
export function formatBangkok(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const text = new Intl.DateTimeFormat("th-TH", {
    timeZone: BANGKOK_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return `${text} น.`;
}

/** จำนวนชั่วโมงที่เหลือก่อนถึงกำหนด (ติดลบ = เลยกำหนด) */
export function hoursUntil(value: Date | string, now: Date = new Date()): number {
  const date = typeof value === "string" ? new Date(value) : value;
  return (date.getTime() - now.getTime()) / 3_600_000;
}
