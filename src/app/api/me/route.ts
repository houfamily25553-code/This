import { NextResponse } from "next/server";
import { authenticate, getRoom, getUser } from "@/lib/server/auth";
import { toRoomPublicDto, toUserDto } from "@/lib/server/docs";
import { route } from "@/lib/server/http";
import type { MeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/me — ตัวตนจาก LINE + ข้อมูลผู้ใช้และห้อง (ถ้าลงทะเบียนแล้ว) */
export const GET = route(async (req) => {
  const identity = await authenticate(req);
  const user = await getUser(identity.line_user_id);
  const room = user?.room_id ? await getRoom(user.room_id) : null;
  const body: MeResponse = {
    identity,
    user: user ? toUserDto(user) : null,
    room: room ? toRoomPublicDto(room) : null,
  };
  return NextResponse.json(body);
});
