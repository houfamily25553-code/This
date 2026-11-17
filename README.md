# Homework Quest — ระบบจัดการและแจ้งเตือนการบ้านผ่าน LINE OA

Next.js (App Router) + TypeScript + Tailwind CSS · Firebase Firestore/Storage (Admin SDK ฝั่งเซิร์ฟเวอร์เท่านั้น) · LINE Messaging API / LINE Login / LIFF · Claude API · Vercel + Vercel Cron

- หัวหน้าห้องลงทะเบียน → ได้รหัสห้อง → เพื่อนกรอกรหัสเข้าห้อง
- หัวหน้าห้องสร้างการบ้าน ระบบสุ่มแต้ม (10–100) ครั้งเดียวที่เซิร์ฟเวอร์ ทุกคนที่ส่งได้แต้มเท่ากัน
- นักเรียนกด "ทำเสร็จแล้ว" รับแต้ม ดูอันดับในห้อง ถาม AI ผู้ช่วยได้
- ถึงเวลาแจ้งเตือน ระบบส่ง LINE เฉพาะคนที่ยังไม่ส่งงาน

## สารบัญ

1. [โครงสร้างโฟลเดอร์](#1-โครงสร้างโฟลเดอร์)
2. [ฐานข้อมูล](#2-ฐานข้อมูล)
3. [คู่มือติดตั้งทีละขั้น](#3-คู่มือติดตั้งทีละขั้น)
4. [Checklist ทดสอบระบบ](#4-checklist-ทดสอบระบบ)
5. [ข้อควรรู้และข้อจำกัด](#5-ข้อควรรู้และข้อจำกัด)

## 1. โครงสร้างโฟลเดอร์

```
.
├── .env.example                 ตัวอย่าง Environment Variables ทั้งหมด
├── firestore.rules              ปิดการอ่าน/เขียนจาก client ทั้งหมด
├── firestore.indexes.json       index ของ query แจ้งเตือน (notified + notify_at)
├── storage.rules                ปิด Storage จาก client ทั้งหมด
├── firebase.json                ใช้ deploy rules/indexes ด้วย firebase-tools
├── vercel.json                  Vercel Cron เรียก /api/cron/notify ทุกชั่วโมง
├── next.config.ts · postcss.config.mjs · tsconfig.json · package.json
├── assets/rich-menu.png         รูป Rich Menu 2500x843
├── scripts/setup-rich-menu.mjs  สร้าง Rich Menu 3 ปุ่ม (npm run richmenu)
└── src/
    ├── app/
    │   ├── layout.tsx · globals.css
    │   ├── page.tsx                 หน้าแรก แยกทางตามสถานะผู้ใช้
    │   ├── liff/register/page.tsx   4.2 ลงทะเบียนหัวหน้าห้อง
    │   ├── join/page.tsx            4.3 นักเรียนกรอกรหัสห้อง
    │   ├── profile/page.tsx         4.3 โปรไฟล์ + ออกจากห้อง
    │   ├── admin/page.tsx           4.4 เว็บแอดมิน
    │   ├── student/page.tsx         4.5 ฟีดการบ้าน + Leaderboard
    │   └── api/
    │       ├── me/route.ts                              ตัวตน + ห้องของผู้ใช้
    │       ├── line/webhook/route.ts                    4.1 signature, follow, คำสั่ง "การบ้าน"
    │       ├── rooms/register/route.ts                  4.2
    │       ├── rooms/join/route.ts · rooms/leave/route.ts   4.3
    │       ├── admin/room/route.ts                      4.4 ดูรหัส (GET) / สร้างรหัสใหม่ (POST)
    │       ├── admin/tasks/route.ts                     4.4 รายการ (GET) / สร้าง+สุ่มแต้ม (POST)
    │       ├── admin/tasks/[task_id]/route.ts           4.4 แก้ไข (PATCH) / ลบ (DELETE)
    │       ├── admin/tasks/[task_id]/submissions/route.ts   4.4 ใครส่งแล้ว/ยังไม่ส่ง
    │       ├── admin/upload/route.ts                    4.4 อัปโหลดรูป
    │       ├── student/tasks/route.ts                   4.5 ฟีด
    │       ├── student/tasks/[task_id]/submit/route.ts  4.5 ส่งงาน (Transaction)
    │       ├── student/leaderboard/route.ts             4.5
    │       ├── cron/notify/route.ts                     4.6
    │       └── chat/route.ts                            4.7
    ├── components/
    │   ├── SessionProvider.tsx · ScreenState.tsx · Avatar.tsx
    │   ├── admin/   RoomCodeCard · TaskForm · SubmissionTable
    │   └── student/ TaskCard · TaskDetailSheet · PointsCelebration · Leaderboard · ChatPanel · task-status
    └── lib/
        ├── types.ts             ชนิดข้อมูล API (snake_case)
        ├── time.ts              ตัวช่วยเวลา Asia/Bangkok
        ├── client/              liff.ts · api.ts · clipboard.ts · image.ts
        └── server/              (server-only)
            ├── env.ts · firebase-admin.ts · docs.ts · http.ts
            ├── line.ts          ตรวจ signature, reply/push/multicast, ตรวจ ID Token
            ├── line-messages.ts Flex Message ทั้งหมด
            ├── auth.ts          authenticate / requireMember / requireAdmin / assertSameRoom
            ├── room-code.ts · rooms.ts     รหัสห้อง, สมาชิก, ข้อความชวนเพื่อน
            ├── tasks.ts · task-input.ts    ดึงงาน, ตรวจข้อมูลฟอร์ม
            ├── storage.ts       อัปโหลด/ลบรูป
            ├── ai.ts            เรียก Claude (ติวเตอร์ + หัวข้อแจ้งเตือน)
            └── chat-quota.ts    จำกัดคำถาม AI ต่อคนต่อวัน
```

## 2. ฐานข้อมูล

| Collection | Doc ID | ฟิลด์ |
|---|---|---|
| `Rooms` | `room_id` เช่น `m4-1` | room_id, room_name, room_secret_code, admin_line_user_id, created_at |
| `Users` | `line_user_id` | line_user_id, display_name, picture_url, role, room_id, total_points, created_at |
| `Tasks` | `task_id` | task_id, room_id, subject, description, image_url, due_date, points, notify_at, notified, created_by, created_at |
| `Submissions` | `${task_id}_${line_user_id}` | task_id, line_user_id, room_id, status, earned_points, submitted_at |
| `ChatUsage` (เพิ่ม) | `${line_user_id}_${YYYY-MM-DD}` | line_user_id, date_key, count, updated_at — นับคำถาม AI รายวัน |

## 3. คู่มือติดตั้งทีละขั้น

### 3.1 สร้าง LINE Official Account
1. เข้า <https://manager.line.biz> → สร้างบัญชี LINE Official Account
2. ตั้งค่า → **Messaging API** → กด "เปิดใช้ Messaging API" → เลือก/สร้าง **Provider** (จำชื่อไว้ ต้องใช้ Provider เดียวกันในขั้น 3.2)
3. ตั้งค่า → **การตั้งค่าการตอบกลับ**: ปิด "ข้อความตอบกลับอัตโนมัติ", เปิด "Webhook"

### 3.2 ตั้งค่า LINE Developers
เข้า <https://developers.line.biz/console> → เลือก Provider เดียวกับข้อ 3.1

**Messaging API channel** (ถูกสร้างให้แล้วจากข้อ 3.1)
1. แท็บ Basic settings → คัดลอก **Channel secret** → `LINE_CHANNEL_SECRET`
2. แท็บ Messaging API → Channel access token (long-lived) → กด Issue → `LINE_CHANNEL_ACCESS_TOKEN`

**LINE Login channel**
1. Create a new channel → **LINE Login** → App types: Web app
2. แท็บ Basic settings → คัดลอก **Channel ID** → `LINE_LOGIN_CHANNEL_ID`
3. Basic settings → **Linked LINE Official Account** → เลือก OA จากข้อ 3.1
4. แท็บ LINE Login → Callback URL ใส่ URL ของเว็บ (ใส่หลัง deploy ในข้อ 3.4)
5. เปลี่ยนสถานะ channel จาก Developing เป็น **Published** (ไม่อย่างนั้นคนอื่นนอกจากผู้ดูแลจะ login ไม่ได้)

**LIFF app** (แท็บ LIFF ของ LINE Login channel)
1. Add → Size: **Full** → Endpoint URL: URL ของเว็บ เช่น `https://your-app.vercel.app`
2. Scopes: ติ๊ก **openid** และ **profile**
3. Add friend option: **On (Aggressive)** — เพื่อให้นักเรียนเพิ่ม OA เป็นเพื่อนตอนเข้าเว็บ (จำเป็นต่อการรับแจ้งเตือน)
4. คัดลอก **LIFF ID** → `NEXT_PUBLIC_LIFF_ID`

> สำคัญ: ทั้งสอง channel ต้องอยู่ใน Provider เดียวกัน ไม่เช่นนั้น user id จาก LIFF กับ Messaging API จะไม่ตรงกัน และส่งแจ้งเตือนไม่ถึง

### 3.3 สร้าง Firebase
1. <https://console.firebase.google.com> → Add project
2. Build → **Firestore Database** → Create database → Production mode → region `asia-southeast1`
3. Build → **Storage** → Get started (โปรเจกต์ใหม่อาจต้องอัปเกรดเป็นแผน Blaze ก่อน) → จดชื่อ bucket → `FIREBASE_STORAGE_BUCKET`
4. Project settings → Service accounts → **Generate new private key** → ได้ไฟล์ JSON
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (คัดลอกทั้งก้อนรวม `\n`)
5. Deploy rules และ index:
   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore,storage --project <FIREBASE_PROJECT_ID>
   ```
   หรือคัดลอกเนื้อหา `firestore.rules` / `storage.rules` ไปวางในแท็บ Rules ของ console และสร้าง composite index ของ `Tasks` (`notified` Ascending, `notify_at` Ascending) ด้วยมือ

### 3.4 Deploy ขึ้น Vercel
1. Push โค้ดขึ้น GitHub → <https://vercel.com/new> → Import repository
2. ใส่ Environment Variables ทุกตัวตาม `.env.example`
   - `CRON_SECRET`: สุ่มด้วย `openssl rand -hex 32`
   - `ANTHROPIC_API_KEY`: สร้างที่ <https://platform.claude.com>
   - `NEXT_PUBLIC_APP_URL`: ใส่โดเมนที่ Vercel ให้ (ถ้ายังไม่รู้ ให้ deploy ครั้งแรกก่อน แล้วกลับมาใส่และ Redeploy)
3. Deploy แล้วนำ URL ไปใส่ใน LIFF Endpoint URL และ Callback URL (ข้อ 3.2)
4. แท็บ Settings → Cron Jobs ตรวจว่ามี `/api/cron/notify`
   - แผน **Hobby รัน cron ได้วันละครั้งเท่านั้น** การตั้ง `0 * * * *` (ทุกชั่วโมง) ต้องใช้แผน Pro
   - ถ้าใช้ Hobby: เปลี่ยน schedule ใน `vercel.json` เป็นวันละครั้ง (เช่น `0 10 * * *` = 17:00 น. เวลาไทย เพราะ cron ใช้ UTC) หรือใช้บริการ cron ภายนอกเรียก `GET /api/cron/notify` ทุกชั่วโมงพร้อม header `Authorization: Bearer <CRON_SECRET>`

### 3.5 ตั้ง Webhook URL และ Rich Menu
1. LINE Developers → Messaging API channel → แท็บ Messaging API → Webhook URL: `https://your-app.vercel.app/api/line/webhook` → กด **Verify** ต้องขึ้น Success → เปิด **Use webhook**
2. สร้าง Rich Menu (รันบนเครื่องตัวเอง):
   ```bash
   cp .env.example .env.local   # กรอก LINE_CHANNEL_ACCESS_TOKEN และ NEXT_PUBLIC_LIFF_ID
   npm install
   npm run richmenu
   ```

### 3.6 พัฒนาบนเครื่อง
```bash
cp .env.example .env.local
npm install
npm run dev          # LIFF ต้องใช้ HTTPS: ใช้ ngrok/cloudflared แล้วตั้ง LIFF Endpoint URL ชั่วคราว
npm run typecheck
```

## 4. Checklist ทดสอบระบบ

ใช้ LINE 2 บัญชี (A = หัวหน้าห้อง, B = นักเรียน)

**เตรียมระบบ**
- [ ] กด Verify ที่ Webhook URL แล้วขึ้น Success
- [ ] เปิด `https://<app>/api/cron/notify` ในเบราว์เซอร์ → ได้ 401 (คนนอกเรียกไม่ได้)
- [ ] Rich Menu 3 ปุ่มแสดงในแชต OA

**หัวหน้าห้อง (A)**
- [ ] เพิ่ม OA เป็นเพื่อน → ได้ข้อความต้อนรับ
- [ ] กด "ลงทะเบียนหัวหน้าห้อง" → กรอกชื่อ/ชั้น/ห้อง → เห็นรหัสรูปแบบ `401-XXXX`
- [ ] ได้ Flex Message ในแชต พร้อมข้อความชวนเพื่อนที่ก๊อปปี้ได้
- [ ] ใช้บัญชี B ลงทะเบียนห้องเดียวกันซ้ำ → ถูกปฏิเสธว่า "ห้องนี้มีหัวหน้าห้องลงทะเบียนแล้ว"
- [ ] หน้า `/admin`: กด "ดูรหัสห้อง", "คัดลอกข้อความชวนเพื่อน" ได้

**นักเรียน (B)**
- [ ] กด "เข้าร่วมห้องเรียน" → กรอกรหัสผิด → ขึ้นข้อความรหัสไม่ถูกต้อง
- [ ] กรอกรหัสถูก → ไปหน้า `/student`
- [ ] เปิด `/join` อีกครั้ง → ถูกพาไป `/student` ทันที
- [ ] เปิด `/admin` → ขึ้น "หน้านี้สำหรับหัวหน้าห้อง"

**การบ้านและแต้ม**
- [ ] A สร้างการบ้านพร้อมรูป ตั้งวันส่งพรุ่งนี้ และเวลาแจ้งเตือนเป็นอีกไม่กี่นาทีข้างหน้า → เห็นแต้มที่สุ่ม (10–100)
- [ ] A แก้ไขรายละเอียด → แต้มไม่เปลี่ยน
- [ ] B เห็นงานในฟีดพร้อมแต้มเดียวกัน ป้ายสีฟ้า (หรือแดงถ้าเหลือไม่ถึง 24 ชม.)
- [ ] B กดดูรายละเอียด → แตะรูปขยายเต็มจอได้
- [ ] B พิมพ์ "การบ้าน" ในแชต OA → ได้รายการงานที่ยังไม่ส่ง
- [ ] A กด "ทำเสร็จแล้ว" → เห็นแอนิเมชันรับแต้ม แต้มรวมเพิ่มเท่าแต้มของงาน การ์ดเป็นสีเขียว
- [ ] A กดส่งซ้ำ (เปิดสองแท็บ) → ถูกปฏิเสธ "คุณส่งงานนี้ไปแล้ว" แต้มไม่เพิ่ม
- [ ] แท็บ "อันดับ" แสดงเฉพาะคนในห้อง เรียงตามแต้ม
- [ ] `/admin` → กดแถบ "ส่งแล้ว x/y" → ตารางแสดง A ส่งแล้ว, B ยังไม่ส่ง

**แจ้งเตือน**
- [ ] รอ cron รอบถัดไป หรือสั่งเอง: `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/notify`
- [ ] B (ยังไม่ส่ง) ได้ LINE แจ้งเตือน · A (ส่งแล้ว) ไม่ได้รับ
- [ ] เรียก cron ซ้ำ → ไม่มีข้อความซ้ำ (`due_tasks: 0`) และใน Firestore งานนั้น `notified = true`
- [ ] B กด "ทำเสร็จแล้ว" → ได้แต้มเท่ากับ A

**AI ผู้ช่วย**
- [ ] B เปิดงาน → "ถามพี่ติว AI" → ถามวิธีทำ → ได้คำอธิบายภาษาไทยที่ไม่เฉลยคำตอบตรงๆ
- [ ] ตั้ง `AI_DAILY_LIMIT=2` ชั่วคราว → ถามครั้งที่ 3 ถูกปฏิเสธ

**อื่นๆ**
- [ ] A กด "สร้างรหัสใหม่" → รหัสเดิมใช้เข้าห้องไม่ได้ สมาชิกเดิมยังอยู่
- [ ] B → โปรไฟล์ → "ออกจากห้อง" → กลับไปหน้ากรอกรหัส
- [ ] A ลบการบ้าน → งานหายจากฟีด และแต้มที่ได้จากงานนั้นถูกหักคืน

## 5. ข้อควรรู้และข้อจำกัด

- **โควตาข้อความ LINE**: การตอบใน webhook ใช้ reply (ไม่กินโควตา) ส่วนที่กินโควตาคือ push ตอนลงทะเบียนหัวหน้าห้อง (1 ข้อความ) และแจ้งเตือน (1 ข้อความต่อคนที่ยังไม่ส่ง ต่อรอบ — งานหลายชิ้นที่ถึงเวลาพร้อมกันถูกรวมเป็นข้อความเดียว)
- **เวลาแจ้งเตือน**: cron รันต้นชั่วโมง จึงช้ากว่าเวลาที่ตั้งได้ไม่เกิน 1 ชั่วโมง งานที่เลยกำหนดส่งแล้วจะไม่ถูกแจ้งเตือน
- **ต้องเป็นเพื่อนกับ OA**: คนที่ไม่ได้เพิ่มเพื่อนหรือบล็อก OA จะไม่ได้รับแจ้งเตือน
- **รองรับโรงเรียนเดียว**: `room_id` มาจากระดับชั้น+ห้อง (เช่น `m4-1`) และรองรับ ม.1–ม.6
- **หัวหน้าห้อง** ส่งงานและสะสมแต้มได้เหมือนนักเรียน และออกจากห้องได้เฉพาะตอนห้องยังไม่มีสมาชิกอื่นและไม่มีการบ้าน
- **ส่งงานหลังเลยกำหนด** ยังกดได้และได้แต้มตามปกติ
- **ค่าใช้จ่าย AI**: ค่าเริ่มต้นใช้ `claude-opus-5-5` เปลี่ยนเป็น `claude-haiku-5-5` ได้ที่ `ANTHROPIC_MODEL` ถ้าต้องการประหยัด และปิดการแต่งหัวข้อแจ้งเตือนด้วย `AI_NOTIFY_ENABLED=false`
