# Homework Quest — ระบบจัดการและแจ้งเตือนการบ้านผ่าน LINE OA

Next.js (App Router) + TypeScript + Tailwind CSS · Firebase Firestore/Storage (Admin SDK ฝั่งเซิร์ฟเวอร์เท่านั้น) · LINE Messaging API / LINE Login / LIFF · Vercel + Vercel Cron

> สถานะ: ส่วนที่ 1 และ 4.1 เสร็จแล้ว — ไฟล์ที่มี ⏳ จะเพิ่มในส่วนถัดไป
> คู่มือติดตั้งและ Checklist ทดสอบจะอยู่ในไฟล์นี้เมื่อครบทุกส่วน

## โครงสร้างโฟลเดอร์

```
.
├── .env.example                 ตัวอย่าง Environment Variables ทั้งหมด
├── firestore.rules              ปิดการอ่าน/เขียนจาก client ทั้งหมด
├── storage.rules                ปิด Storage จาก client ทั้งหมด
├── vercel.json                  Vercel Cron เรียก /api/cron/notify ทุกชั่วโมง
├── next.config.ts · postcss.config.mjs · tsconfig.json · package.json
├── assets/rich-menu.png         รูป Rich Menu 2500x843
├── scripts/
│   └── setup-rich-menu.mjs      สร้าง Rich Menu 3 ปุ่ม (npm run richmenu)
└── src/
    ├── app/
    │   ├── layout.tsx           ครอบทุกหน้าด้วย SessionProvider (LIFF login)
    │   ├── globals.css
    │   ├── page.tsx             หน้าแรก แยกทางตามสถานะผู้ใช้
    │   ├── liff/register/page.tsx   ⏳ 4.2 ลงทะเบียนหัวหน้าห้อง
    │   ├── join/page.tsx            ⏳ 4.3 นักเรียนกรอกรหัสห้อง
    │   ├── profile/page.tsx         ⏳ 4.3 โปรไฟล์ + ออกจากห้อง
    │   ├── admin/page.tsx           ⏳ 4.4 เว็บแอดมิน
    │   ├── student/page.tsx         ⏳ 4.5 ฟีดการบ้าน + Leaderboard
    │   └── api/
    │       ├── me/route.ts                      ตัวตน + ห้องของผู้ใช้
    │       ├── line/webhook/route.ts            ตรวจ signature, follow, คำสั่ง "การบ้าน"
    │       ├── rooms/register/route.ts          ⏳ 4.2
    │       ├── rooms/join/route.ts              ⏳ 4.3
    │       ├── rooms/leave/route.ts             ⏳ 4.3
    │       ├── admin/room/route.ts              ⏳ 4.4 ดูรหัส / สร้างรหัสใหม่
    │       ├── admin/tasks/route.ts             ⏳ 4.4 รายการ / สร้าง (สุ่มแต้ม)
    │       ├── admin/tasks/[task_id]/route.ts   ⏳ 4.4 แก้ไข / ลบ
    │       ├── admin/tasks/[task_id]/submissions/route.ts  ⏳ 4.4
    │       ├── admin/upload/route.ts            ⏳ 4.4 อัปโหลดรูป
    │       ├── student/tasks/route.ts           ⏳ 4.5
    │       ├── student/tasks/[task_id]/submit/route.ts     ⏳ 4.5 Transaction
    │       ├── student/leaderboard/route.ts     ⏳ 4.5
    │       ├── cron/notify/route.ts             ⏳ 4.6
    │       └── chat/route.ts                    ⏳ 4.7
    ├── components/
    │   ├── SessionProvider.tsx  LIFF login + โหลด /api/me (hook: useSession)
    │   └── ScreenState.tsx      หน้าจอ loading / ข้อความ
    └── lib/
        ├── types.ts             ชนิดข้อมูล API (snake_case)
        ├── time.ts              ตัวช่วยเวลา Asia/Bangkok
        ├── client/
        │   ├── liff.ts          init LIFF, ขอ ID Token
        │   └── api.ts           fetch ที่แนบ ID Token ทุกครั้ง
        └── server/              (server-only)
            ├── env.ts           อ่าน env, สร้างลิงก์ LIFF
            ├── firebase-admin.ts  Firestore / Storage (Admin SDK)
            ├── docs.ts          รูปร่างเอกสาร Firestore + ตัวแปลงเป็น DTO
            ├── http.ts          ApiError, ตัวครอบ route, ตรวจ input
            ├── line.ts          ตรวจ signature, reply/push/multicast, ตรวจ ID Token
            ├── auth.ts          authenticate / requireMember / requireAdmin
            └── room-code.ts     สร้าง room_id และ room_secret_code
```

## เริ่มพัฒนา

```bash
cp .env.example .env.local   # แล้วกรอกค่า
npm install
npm run dev
```
