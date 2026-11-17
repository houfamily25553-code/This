"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingScreen, MessageScreen } from "@/components/ScreenState";
import { useSession } from "@/components/SessionProvider";

export default function HomePage() {
  const router = useRouter();
  const { status, me, error } = useSession();
  const has_room = Boolean(me?.user?.room_id);
  const role = me?.user?.role;

  useEffect(() => {
    // ถ้าเปิดผ่านลิงก์ LIFF ที่มี path ต่อท้าย LIFF จะพาไปหน้านั้นเอง ไม่ต้อง redirect ซ้อน
    if (new URLSearchParams(window.location.search).has("liff.state")) return;
    if (status === "ready" && has_room && role === "student") router.replace("/student");
  }, [status, has_room, role, router]);

  if (status === "loading") return <LoadingScreen label="กำลังเข้าสู่ระบบด้วย LINE..." />;
  if (status === "error") return <MessageScreen title="เข้าสู่ระบบไม่สำเร็จ" detail={error} />;
  if (has_room && role === "student") return <LoadingScreen />;

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-4 p-6">
      <div className="text-center">
        <p className="text-5xl">🎮</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-800">Homework Quest</h1>
        <p className="mt-1 text-sm text-slate-500">
          สวัสดี {me?.identity.display_name || "นักเรียน"}
          {me?.room ? ` · ห้อง ${me.room.room_name}` : ""}
        </p>
      </div>

      {has_room ? (
        <>
          <Link href="/admin" className="rounded-2xl bg-sky-500 p-4 text-center font-semibold text-white shadow">
            จัดการการบ้าน (หัวหน้าห้อง)
          </Link>
          <Link href="/student" className="rounded-2xl bg-white p-4 text-center font-semibold text-sky-600 shadow">
            ดูการบ้านของฉัน
          </Link>
        </>
      ) : (
        <>
          <Link href="/join" className="rounded-2xl bg-sky-500 p-4 text-center font-semibold text-white shadow">
            เข้าร่วมห้องเรียน
          </Link>
          <Link href="/liff/register" className="rounded-2xl bg-white p-4 text-center font-semibold text-sky-600 shadow">
            ลงทะเบียนหัวหน้าห้อง
          </Link>
        </>
      )}
    </main>
  );
}
