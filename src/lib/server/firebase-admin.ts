import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { requireEnv } from "./env";

// ชื่อ collection ทั้งหมดของระบบ (ChatUsage ใช้นับโควตาคำถาม AI รายวัน)
export const COLLECTIONS = {
  rooms: "Rooms",
  users: "Users",
  tasks: "Tasks",
  submissions: "Submissions",
  chat_usage: "ChatUsage",
} as const;

// สร้างแบบ lazy เพื่อให้ `next build` ผ่านได้แม้ยังไม่ได้ตั้ง env
function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      // Vercel เก็บ \n เป็นตัวอักษร ต้องแปลงกลับเป็นขึ้นบรรทัดใหม่จริง
      privateKey: requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    storageBucket: requireEnv("FIREBASE_STORAGE_BUCKET"),
  });
}

export function db(): Firestore {
  return getFirestore(adminApp());
}

export function bucket() {
  return getStorage(adminApp()).bucket();
}
