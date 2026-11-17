"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { LoadingScreen, MessageScreen } from "@/components/ScreenState";
import { useSession } from "@/components/SessionProvider";
import { api } from "@/lib/client/api";

export default function JoinPage() {
  const router = useRouter();
  const { status, me, error: session_error, refresh } = useSession();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const has_room = Boolean(me?.user?.room_id);

  // เคยผูกห้องแล้ว -> ไปหน้าการบ้านทันที
  useEffect(() => {
    if (status === "ready" && has_room) router.replace("/student");
  }, [status, has_room, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("/api/rooms/join", { method: "POST", body: { room_secret_code: code } });
      await refresh();
      router.replace("/student");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าร่วมห้องไม่สำเร็จ");
      setSubmitting(false);
    }
  }

  if (status === "loading") return <LoadingScreen label="กำลังเข้าสู่ระบบด้วย LINE..." />;
  if (status === "error") return <MessageScreen title="เข้าสู่ระบบไม่สำเร็จ" detail={session_error} />;
  if (has_room) return <LoadingScreen label="กำลังพาไปหน้าการบ้าน..." />;

  return (
    <main className="flex min-h-dvh flex-col justify-center p-6">
      <p className="text-center text-5xl">🚪</p>
      <h1 className="mt-3 text-center text-xl font-bold">เข้าร่วมห้องเรียน</h1>
      <p className="mt-1 text-center text-sm text-slate-500">
        สวัสดี {me?.identity.display_name || "นักเรียน"} กรอกรหัสห้องที่ได้จากหัวหน้าห้อง
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          required
          aria-label="รหัสห้อง"
          placeholder="401-K7XP"
          className="rounded-2xl border-2 border-slate-300 bg-white p-4 text-center font-mono text-2xl font-bold tracking-widest focus:border-sky-500 focus:outline-none"
        />
        {error ? <p className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || code.trim().length < 5}
          className="rounded-2xl bg-sky-500 p-4 font-semibold text-white shadow disabled:opacity-50"
        >
          {submitting ? "กำลังตรวจสอบ..." : "เข้าร่วมห้อง"}
        </button>
      </form>
    </main>
  );
}
