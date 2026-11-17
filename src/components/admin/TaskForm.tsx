"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "@/lib/client/api";
import { compressImage } from "@/lib/client/image";
import { toBangkokLocalInput } from "@/lib/time";
import type { AdminTaskDto, TaskDto } from "@/lib/types";

interface Props {
  /** null = สร้างใหม่ */
  task: AdminTaskDto | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TaskForm({ task, onClose, onSaved }: Props) {
  const [subject, setSubject] = useState(task?.subject ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [image_url, setImageUrl] = useState(task?.image_url ?? "");
  const [due_date, setDueDate] = useState(task ? toBangkokLocalInput(task.due_date) : "");
  const [notify_at, setNotifyAt] = useState(task?.notify_at ? toBangkokLocalInput(task.notify_at) : "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", await compressImage(file));
      const data = await api<{ image_url: string }>("/api/admin/upload", { method: "POST", body: form });
      setImageUrl(data.image_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  /** ปุ่มลัด: ตั้งเวลาแจ้งเตือนก่อนวันส่ง N ชั่วโมง */
  function setNotifyBefore(hours: number) {
    if (!due_date) return;
    const due = new Date(`${due_date}:00+07:00`);
    setNotifyAt(toBangkokLocalInput(new Date(due.getTime() - hours * 3_600_000)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = { subject, description, image_url, due_date, notify_at };
      if (task) {
        await api<{ task: TaskDto }>(`/api/admin/tasks/${task.task_id}`, { method: "PATCH", body });
      } else {
        await api<{ task: TaskDto }>("/api/admin/tasks", { method: "POST", body });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
      setSaving(false);
    }
  }

  const input = "rounded-xl border border-slate-300 bg-white p-3 text-base";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 animate-fade-in">
      <form
        onSubmit={onSubmit}
        className="flex max-h-[92dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-3xl bg-slate-50 p-5 animate-sheet-up"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{task ? "แก้ไขการบ้าน" : "สร้างการบ้านใหม่"}</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="h-9 w-9 rounded-full bg-slate-200 text-lg">
            ×
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          วิชา
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={80} required className={input} placeholder="เช่น คณิตศาสตร์" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          รายละเอียด
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={4}
            className={input}
            placeholder="เช่น แบบฝึกหัด 3.2 ข้อ 1-10 หน้า 45"
          />
        </label>

        <div className="flex flex-col gap-2 text-sm font-medium">
          รูปประกอบ (ไม่บังคับ)
          {image_url ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image_url} alt="รูปประกอบการบ้าน" className="max-h-48 w-full rounded-xl object-contain bg-slate-200" />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white"
              >
                ลบรูป
              </button>
            </div>
          ) : (
            <label className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-4 text-center text-slate-500">
              {uploading ? "กำลังอัปโหลด..." : "📷 แตะเพื่อเลือกรูป"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickImage} disabled={uploading} className="hidden" />
            </label>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          วันและเวลาส่ง
          <input type="datetime-local" value={due_date} onChange={(e) => setDueDate(e.target.value)} required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          เวลาแจ้งเตือนทาง LINE (ไม่บังคับ)
          <input type="datetime-local" value={notify_at} onChange={(e) => setNotifyAt(e.target.value)} className={input} />
        </label>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { label: "ก่อนส่ง 3 ชม.", hours: 3 },
            { label: "ก่อนส่ง 12 ชม.", hours: 12 },
            { label: "ก่อนส่ง 1 วัน", hours: 24 },
          ].map((preset) => (
            <button
              key={preset.hours}
              type="button"
              disabled={!due_date}
              onClick={() => setNotifyBefore(preset.hours)}
              className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700 disabled:opacity-40"
            >
              {preset.label}
            </button>
          ))}
          {notify_at ? (
            <button type="button" onClick={() => setNotifyAt("")} className="rounded-full bg-slate-200 px-3 py-1 font-medium">
              ไม่แจ้งเตือน
            </button>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">
          ระบบตรวจทุกต้นชั่วโมง จึงแจ้งเตือนช้ากว่าเวลาที่ตั้งได้ไม่เกิน 1 ชม. และส่งเฉพาะคนที่ยังไม่ส่งงาน
          {task ? " · แต้มของงานแก้ไขไม่ได้" : " · แต้มของงานจะถูกสุ่ม (10-100) ตอนกดสร้าง"}
        </p>

        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-2xl bg-sky-500 p-4 font-semibold text-white shadow disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : task ? "บันทึกการแก้ไข" : "สร้างการบ้าน 🎲"}
        </button>
      </form>
    </div>
  );
}
