"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { LoadingScreen, MessageScreen } from "@/components/ScreenState";
import { useSession } from "@/components/SessionProvider";
import { api } from "@/lib/client/api";

export default function ProfilePage() {
  const router = useRouter();
  const { status, me, error: session_error, refresh } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const user = me?.user;

  useEffect(() => {
    if (status === "ready" && !user?.room_id) router.replace("/join");
  }, [status, user?.room_id, router]);

  async function leave() {
    setError("");
    setLeaving(true);
    try {
      await api("/api/rooms/leave", { method: "POST" });
      await refresh();
      router.replace("/join");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ออกจากห้องไม่สำเร็จ");
      setLeaving(false);
      setConfirming(false);
    }
  }

  if (status === "loading") return <LoadingScreen />;
  if (status === "error") return <MessageScreen title="เข้าสู่ระบบไม่สำเร็จ" detail={session_error} />;
  if (!user?.room_id) return <LoadingScreen />;

  return (
    <main className="flex min-h-dvh flex-col gap-4 p-6">
      <Link href="/student" className="text-sm font-medium text-sky-600">
        ← กลับหน้าการบ้าน
      </Link>

      <section className="flex flex-col items-center gap-2 rounded-2xl bg-white p-6 shadow">
        <Avatar src={user.picture_url} name={user.display_name} size={84} />
        <h1 className="text-lg font-bold">{user.display_name}</h1>
        <p className="text-sm text-slate-500">
          ห้อง {me?.room?.room_name} · {user.role === "admin" ? "หัวหน้าห้อง" : "นักเรียน"}
        </p>
        <p className="mt-2 rounded-full bg-amber-100 px-4 py-1 font-bold text-amber-700">⭐ {user.total_points} แต้ม</p>
      </section>

      {user.role === "admin" ? (
        <Link href="/admin" className="rounded-2xl bg-sky-500 p-4 text-center font-semibold text-white shadow">
          จัดการการบ้าน (หัวหน้าห้อง)
        </Link>
      ) : null}

      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}

      <section className="mt-auto rounded-2xl border border-red-200 bg-white p-4">
        <h2 className="font-semibold text-slate-800">เข้าผิดห้อง?</h2>
        <p className="mt-1 text-sm text-slate-500">
          ออกจากห้องแล้วแต้มในห้องนี้จะถูกรีเซ็ต ถ้ากลับเข้าห้องเดิม แต้มจากงานที่เคยส่งจะกลับมา
        </p>
        {confirming ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="rounded-xl bg-slate-100 p-3 font-medium">
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={leave}
              disabled={leaving}
              className="rounded-xl bg-red-500 p-3 font-semibold text-white disabled:opacity-50"
            >
              {leaving ? "กำลังออก..." : "ยืนยันออกจากห้อง"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-3 w-full rounded-xl border border-red-300 p-3 font-semibold text-red-600"
          >
            ออกจากห้อง
          </button>
        )}
      </section>
    </main>
  );
}
