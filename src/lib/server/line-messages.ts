import "server-only";
import { formatBangkok, hoursUntil } from "@/lib/time";
import type { TaskDoc } from "./docs";
import { liffUrl } from "./env";
import type { LineMessage } from "./line";

const SKY = "#0EA5E9";
const RED = "#EF4444";
const MUTED = "#64748B";

function uriButton(label: string, uri: string, style: "primary" | "secondary" = "primary") {
  return {
    type: "button",
    style,
    height: "sm",
    ...(style === "primary" ? { color: SKY } : {}),
    action: { type: "uri", label, uri },
  };
}

/** ข้อความต้อนรับตอนเพิ่มเพื่อน */
export function welcomeMessage(display_name: string): LineMessage {
  return {
    type: "flex",
    altText: "ยินดีต้อนรับสู่ Homework Quest! เลือกเมนูเพื่อเริ่มใช้งาน",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "🎮 Homework Quest", weight: "bold", size: "xl", color: SKY },
          {
            type: "text",
            text: `สวัสดี${display_name ? ` ${display_name}` : ""}! ที่นี่ช่วยเตือนการบ้านและให้สะสมแต้มทุกครั้งที่ทำงานเสร็จ`,
            wrap: true,
            size: "sm",
          },
          {
            type: "text",
            text: "• หัวหน้าห้อง: กดลงทะเบียนเพื่อสร้างห้อง\n• นักเรียน: กดเข้าร่วมแล้วกรอกรหัสห้อง\n• พิมพ์ \"การบ้าน\" เพื่อดูงานที่ยังไม่ส่ง",
            wrap: true,
            size: "sm",
            color: MUTED,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          uriButton("เข้าร่วมห้องเรียน", liffUrl("/join")),
          uriButton("ลงทะเบียนหัวหน้าห้อง", liffUrl("/liff/register"), "secondary"),
        ],
      },
    },
  };
}

/** ตอบเมื่อคนที่ยังไม่มีห้องพิมพ์คำสั่ง */
export function needRoomMessage(): LineMessage {
  return {
    type: "flex",
    altText: "คุณยังไม่ได้เข้าร่วมห้องเรียน",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: "ยังไม่ได้เข้าร่วมห้องเรียน", weight: "bold" },
          { type: "text", text: "ขอรหัสห้องจากหัวหน้าห้อง แล้วกดปุ่มด้านล่าง", wrap: true, size: "sm", color: MUTED },
        ],
      },
      footer: { type: "box", layout: "vertical", contents: [uriButton("เข้าร่วมห้องเรียน", liffUrl("/join"))] },
    },
  };
}

const MAX_TASK_ROWS = 10;

function taskRow(task: TaskDoc, now: Date) {
  const due = task.due_date.toDate();
  const hours = hoursUntil(due, now);
  const urgent = hours < 24;
  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    contents: [
      {
        type: "box",
        layout: "vertical",
        flex: 5,
        contents: [
          { type: "text", text: task.subject, weight: "bold", size: "sm", wrap: true },
          {
            type: "text",
            text: `${hours < 0 ? "เลยกำหนด " : "ส่ง "}${formatBangkok(due)}`,
            size: "xs",
            color: urgent ? RED : MUTED,
            wrap: true,
          },
        ],
      },
      { type: "text", text: `+${task.points}`, flex: 2, align: "end", gravity: "center", weight: "bold", color: SKY },
    ],
  };
}

/** รายการงานที่ยังไม่ส่ง (ตอบคำสั่ง "การบ้าน") */
export function pendingTasksMessage(room_name: string, tasks: TaskDoc[], now: Date = new Date()): LineMessage {
  const rows: unknown[] = [];
  tasks.slice(0, MAX_TASK_ROWS).forEach((task, i) => {
    if (i > 0) rows.push({ type: "separator" });
    rows.push(taskRow(task, now));
  });
  if (tasks.length > MAX_TASK_ROWS) {
    rows.push({ type: "text", text: `และอีก ${tasks.length - MAX_TASK_ROWS} งาน`, size: "xs", color: MUTED, align: "center" });
  }
  if (tasks.length === 0) {
    rows.push({ type: "text", text: "🎉 ไม่มีงานค้าง เคลียร์ทุกภารกิจแล้ว!", wrap: true, size: "sm" });
  }

  return {
    type: "flex",
    altText: tasks.length ? `คุณมีการบ้านที่ยังไม่ส่ง ${tasks.length} งาน` : "ไม่มีการบ้านค้าง 🎉",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: SKY,
        contents: [
          { type: "text", text: `ภารกิจที่ยังไม่ส่ง (${tasks.length})`, color: "#FFFFFF", weight: "bold" },
          { type: "text", text: `ห้อง ${room_name}`, color: "#E0F2FE", size: "xs" },
        ],
      },
      body: { type: "box", layout: "vertical", spacing: "md", contents: rows },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [uriButton("เปิดดูและส่งงาน", liffUrl("/student"))],
      },
    },
  };
}

/** ส่งให้หัวหน้าห้องหลังลงทะเบียน: รหัสห้อง + ลิงก์ (ข้อความที่สองเป็น text ล้วน กดค้างแล้วก๊อปปี้ได้เลย) */
export function roomRegisteredMessages(
  room_name: string,
  room_secret_code: string,
  invite_text: string,
): LineMessage[] {
  return [
    {
      type: "flex",
      altText: `ลงทะเบียนห้อง ${room_name} สำเร็จ รหัสห้อง ${room_secret_code}`,
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: SKY,
          contents: [
            { type: "text", text: "👑 ลงทะเบียนสำเร็จ", color: "#FFFFFF", weight: "bold", size: "lg" },
            { type: "text", text: `คุณคือหัวหน้าห้อง ${room_name}`, color: "#E0F2FE", size: "sm" },
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            { type: "text", text: "รหัสห้อง", size: "xs", color: MUTED },
            { type: "text", text: room_secret_code, size: "3xl", weight: "bold", align: "center", color: SKY },
            { type: "separator" },
            {
              type: "text",
              text: "ก๊อปปี้ข้อความถัดไป (กดค้าง > คัดลอก) ไปวางในกลุ่ม LINE ห้องได้เลย",
              wrap: true,
              size: "sm",
              color: MUTED,
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            uriButton("เปิดหน้าจัดการการบ้าน", liffUrl("/admin")),
            {
              type: "button",
              style: "secondary",
              height: "sm",
              action: { type: "clipboard", label: "คัดลอกข้อความชวนเพื่อน", clipboardText: invite_text.slice(0, 1000) },
            },
          ],
        },
      },
    },
    { type: "text", text: invite_text },
  ];
}

/** แจ้งเตือนงานใกล้ถึงกำหนด (ข้อความเดียวรวมทุกงานที่คนกลุ่มนี้ยังไม่ส่ง) */
export function reminderMessage(room_name: string, headline: string, tasks: TaskDoc[], now: Date = new Date()): LineMessage {
  const rows: unknown[] = [];
  tasks.slice(0, MAX_TASK_ROWS).forEach((task, i) => {
    if (i > 0) rows.push({ type: "separator" });
    rows.push(taskRow(task, now));
  });
  return {
    type: "flex",
    altText: `${headline} (${tasks.map((t) => t.subject).join(", ")})`.slice(0, 400),
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: RED,
        contents: [
          { type: "text", text: headline, color: "#FFFFFF", weight: "bold", wrap: true },
          { type: "text", text: `ห้อง ${room_name} · ยังไม่ส่ง ${tasks.length} งาน`, color: "#FEE2E2", size: "xs" },
        ],
      },
      body: { type: "box", layout: "vertical", spacing: "md", contents: rows },
      footer: { type: "box", layout: "vertical", contents: [uriButton("ไปทำภารกิจ", liffUrl("/student"))] },
    },
  };
}
