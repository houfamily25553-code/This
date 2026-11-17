// สร้าง Rich Menu 3 ปุ่ม อัปโหลดรูป และตั้งเป็นเมนูเริ่มต้นของ LINE OA
// วิธีใช้:  npm run richmenu     (อ่านค่าจาก .env.local)
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;
if (!TOKEN || !LIFF_ID) {
  console.error("ต้องตั้งค่า LINE_CHANNEL_ACCESS_TOKEN และ NEXT_PUBLIC_LIFF_ID ใน .env.local ก่อน");
  process.exit(1);
}

const MENU_NAME = "homework-quest-main";
const IMAGE_PATH = fileURLToPath(new URL("../assets/rich-menu.png", import.meta.url));
const WIDTH = 2500;
const HEIGHT = 843;
const liff = (path) => `https://liff.line.me/${LIFF_ID}${path}`;

const BUTTONS = [
  { label: "ลงทะเบียนหัวหน้าห้อง", uri: liff("/liff/register") },
  { label: "เข้าร่วมห้องเรียน", uri: liff("/join") },
  { label: "ดูการบ้าน", uri: liff("/student") },
];

async function line(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${url} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

const column = Math.floor(WIDTH / BUTTONS.length);
const rich_menu = {
  size: { width: WIDTH, height: HEIGHT },
  selected: true,
  name: MENU_NAME,
  chatBarText: "เมนูการบ้าน",
  areas: BUTTONS.map((button, i) => ({
    bounds: {
      x: i * column,
      y: 0,
      width: i === BUTTONS.length - 1 ? WIDTH - i * column : column,
      height: HEIGHT,
    },
    action: { type: "uri", label: button.label, uri: button.uri },
  })),
};

// 1) ลบเมนูชื่อเดียวกันที่เคยสร้างไว้ (รันซ้ำได้ไม่รก)
const { richmenus = [] } = await line("https://api.line.me/v2/bot/richmenu/list");
for (const menu of richmenus.filter((m) => m.name === MENU_NAME)) {
  await line(`https://api.line.me/v2/bot/richmenu/${menu.richMenuId}`, { method: "DELETE" });
  console.log("ลบเมนูเก่า", menu.richMenuId);
}

// 2) สร้างเมนู
const { richMenuId } = await line("https://api.line.me/v2/bot/richmenu", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(rich_menu),
});
console.log("สร้าง Rich Menu", richMenuId);

// 3) อัปโหลดรูป (2500x843, PNG, ไม่เกิน 1MB)
await line(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
  method: "POST",
  headers: { "Content-Type": "image/png" },
  body: await readFile(IMAGE_PATH),
});
console.log("อัปโหลดรูปแล้ว");

// 4) ตั้งเป็นเมนูเริ่มต้นของทุกคน
await line(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, { method: "POST" });
console.log("ตั้งเป็นเมนูเริ่มต้นเรียบร้อย ✅");
