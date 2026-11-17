"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { copyText } from "@/lib/client/clipboard";
import type { RoomAdminResponse } from "@/lib/types";

/** ดูรหัสห้อง, ก๊อปปี้ข้อความชวนเพื่อน, สร้างรหัสใหม่ */
export function RoomCodeCard() {
  const [data, setData] = useState<RoomAdminResponse | null>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<RoomAdminResponse>("/api/admin/room")
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "โหลดรหัสห้องไม่สำเร็จ"));
  }, []);

  async function regenerate() {
    setBusy(true);
    setError("");
    try {
      setData(await api<RoomAdminResponse>("/api/admin/room", { method: "POST" }));
      setVisible(true);
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างรหัสใหม่ไม่สำเร็จ");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">รหัสห้อง</h2>
        <button type="button" onClick={() => setVisible((v) => !v)} className="text-sm font-medium text-sky-600">
          {visible ? "ซ่อน" : "ดูรหัสห้อง"}
        </button>
      </div>
      <p className="mt-2 text-center font-mono text-3xl font-bold tracking-widest text-sky-600">
        {data ? (visible ? data.room.room_secret_code : "•••-••••") : "..."}
      </p>
      {error ? <p className="mt-2 rounded-xl bg-red-50 p-2 text-sm text-red-600">{error}</p> : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!data}
          onClick={async () => data && setCopied(await copyText(data.invite_text))}
          className="rounded-xl bg-sky-500 p-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {copied ? "คัดลอกแล้ว ✓" : "คัดลอกข้อความชวนเพื่อน"}
        </button>
        <button
          type="button"
          disabled={!data}
          onClick={() => setConfirming(true)}
          className="rounded-xl border border-slate-300 p-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          สร้างรหัสใหม่
        </button>
      </div>

      {confirming ? (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <p>รหัสเดิมจะใช้ไม่ได้ทันที เพื่อนที่เข้าห้องแล้วไม่กระทบ ใช้เมื่อรหัสหลุดไปนอกห้อง</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="rounded-lg bg-white p-2 font-medium">
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={regenerate}
              disabled={busy}
              className="rounded-lg bg-amber-500 p-2 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "กำลังสร้าง..." : "ยืนยัน"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
