import "server-only";
import { randomUUID } from "node:crypto";
import { requireEnv } from "./env";
import { bucket } from "./firebase-admin";
import { badRequest } from "./http";

// Vercel จำกัด body ของ function ที่ ~4.5MB หน้าเว็บจะย่อรูปก่อนส่งอยู่แล้ว
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function urlPrefix(): string {
  return `https://firebasestorage.googleapis.com/v0/b/${requireEnv("FIREBASE_STORAGE_BUCKET")}/o/`;
}

/** image_url ต้องว่าง หรือเป็นไฟล์ใน bucket ของเรา ใต้โฟลเดอร์ของห้องนั้นเท่านั้น */
export function assertOwnImageUrl(image_url: string, room_id: string): void {
  if (!image_url) return;
  const prefix = `${urlPrefix()}${encodeURIComponent(`tasks/${room_id}/`)}`;
  if (!image_url.startsWith(prefix)) throw badRequest("รูปประกอบไม่ถูกต้อง กรุณาอัปโหลดใหม่");
}

/** อัปโหลดรูปประกอบการบ้าน คืน URL ที่เปิดดูได้ด้วย download token (Storage Rules ยังปิดอยู่) */
export async function uploadTaskImage(room_id: string, file: File): Promise<string> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw badRequest("รองรับเฉพาะรูป JPG, PNG หรือ WEBP");
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) throw badRequest("รูปต้องมีขนาดไม่เกิน 4MB");

  const path = `tasks/${room_id}/${randomUUID()}.${ext}`;
  const token = randomUUID();
  await bucket()
    .file(path)
    .save(Buffer.from(await file.arrayBuffer()), {
      resumable: false,
      contentType: file.type,
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
  return `${urlPrefix()}${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/** ลบรูปเก่า (ไม่ throw ถ้าลบไม่ได้) */
export async function deleteTaskImage(image_url: string): Promise<void> {
  if (!image_url.startsWith(urlPrefix())) return;
  try {
    const encoded = image_url.slice(urlPrefix().length).split("?")[0];
    await bucket().file(decodeURIComponent(encoded)).delete({ ignoreNotFound: true });
  } catch (err) {
    console.error("[storage] delete failed", err);
  }
}
