"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { LoadingScreen, MessageScreen } from "@/components/ScreenState";
import { useSession } from "@/components/SessionProvider";
import { api } from "@/lib/client/api";
import { copyText } from "@/lib/client/clipboard";
import type { RegisterResponse } from "@/lib/types";

const GRADES = [1, 2, 3, 4, 5, 6];

export default function RegisterPage() {
  const { status, me, error: session_error, refresh } = useSession();
  const [display_name, setDisplayName] = useState("");
  const [grade, setGrade] = useState(4);
  const [room_number, setRoomNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (me && !display_name) setDisplayName(me.identity.display_name);
    // ตั้งค่าเริ่มต้นครั้งเดียวตอนโหลดโปรไฟล์
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await api<RegisterResponse>("/api/rooms/register", {
        method: "POST",
        body: { display_name, grade, room_number: Number(room_number) },
      });
      setResult(data);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลงทะเบียนไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") return <LoadingScreen label="กำลังเข้าสู่ระบบด้วย LINE..." />;
  if (status === "error") return <MessageScreen title="เข้าสู่ระบบไม่สำเร็จ" detail={session_error} />;

  if (result) {
    return (
      <main className="flex min-h-dvh flex-col gap-4 p-6">
        <div className="text-center">
          <p className="text-5xl">👑</p>
          <h1 className="mt-2 text-xl font-bold">ลงทะเบียนสำเร็จ</h1>
          <p className="text-sm text-slate-500">คุณคือหัวหน้าห้อง {result.room.room_name}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 text-center shadow">
          <p className="text-xs text-slate-500">รหัสห้อง</p>
          <p className="mt-1 font-mono text-4xl font-bold tracking-widest text-sky-600">{result.room.room_secret_code}</p>
        </div>
        <pre className="whitespace-pre-wrap rounded-2xl bg-slate-100 p-4 font-sans text-sm text-slate-700">{result.invite_text}</pre>
        <button
          type="button"
          onClick={async () => setCopied(await copyText(result.invite_text))}
          className="rounded-2xl bg-sky-500 p-4 font-semibold text-white shadow active:bg-sky-600"
        >
          {copied ? "คัดลอกแล้ว ✓ นำไปวางในกลุ่มห้องได้เลย" : "คัดลอกข้อความชวนเพื่อน"}
        </button>
        <p className="text-center text-xs text-slate-500">
          {result.push_sent
            ? "ส่งรหัสห้องไปที่แชต LINE ของคุณแล้ว"
            : "ส่งข้อความเข้า LINE ไม่สำเร็จ (ต้องเพิ่มบัญชีทางการเป็นเพื่อนก่อน) แต่ดูรหัสได้เสมอที่หน้าจัดการ"}
        </p>
        <Link href="/admin" className="rounded-2xl bg-white p-4 text-center font-semibold text-sky-600 shadow">
          ไปหน้าจัดการการบ้าน
        </Link>
      </main>
    );
  }

  if (me?.user?.room_id) {
    return (
      <MessageScreen
        title={`คุณอยู่ห้อง ${me.room?.room_name ?? ""} แล้ว`}
        detail={me.user.role === "admin" ? "คุณเป็นหัวหน้าห้องของห้องนี้" : "ถ้าต้องการเป็นหัวหน้าห้องอื่น ให้ออกจากห้องเดิมก่อนที่หน้าโปรไฟล์"}
      >
        <Link
          href={me.user.role === "admin" ? "/admin" : "/profile"}
          className="mt-2 rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-white"
        >
          {me.user.role === "admin" ? "ไปหน้าจัดการการบ้าน" : "ไปหน้าโปรไฟล์"}
        </Link>
      </MessageScreen>
    );
  }

  return (
    <main className="min-h-dvh p-6">
      <h1 className="text-xl font-bold">ลงทะเบียนหัวหน้าห้อง</h1>
      <p className="mt-1 text-sm text-slate-500">หนึ่งห้องมีหัวหน้าห้องได้ 1 คน ระบบจะสร้างรหัสห้องให้อัตโนมัติ</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          ชื่อ
          <input
            value={display_name}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            required
            className="rounded-xl border border-slate-300 bg-white p-3 text-base"
            placeholder="ชื่อที่เพื่อนในห้องรู้จัก"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            ระดับชั้น
            <select
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-white p-3 text-base"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  ม.{g}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            ห้อง
            <input
              value={room_number}
              onChange={(e) => setRoomNumber(e.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
              required
              className="rounded-xl border border-slate-300 bg-white p-3 text-base"
              placeholder="เช่น 1"
            />
          </label>
        </div>
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || !display_name.trim() || !room_number}
          className="rounded-2xl bg-sky-500 p-4 font-semibold text-white shadow disabled:opacity-50"
        >
          {submitting ? "กำลังลงทะเบียน..." : `ลงทะเบียนห้อง ม.${grade}/${room_number || "?"}`}
        </button>
      </form>
    </main>
  );
}
