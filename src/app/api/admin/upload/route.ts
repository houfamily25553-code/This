import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { badRequest, route } from "@/lib/server/http";
import { uploadTaskImage } from "@/lib/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/upload (multipart, field "file") — อัปโหลดรูปประกอบเข้าโฟลเดอร์ของห้องตัวเอง */
export const POST = route(async (req) => {
  const { user } = await requireAdmin(req);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("รูปแบบข้อมูลไม่ถูกต้อง");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("กรุณาเลือกรูป");
  const image_url = await uploadTaskImage(user.room_id, file);
  return NextResponse.json({ image_url }, { status: 201 });
});
