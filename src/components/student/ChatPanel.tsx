"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/client/api";
import type { ChatMessageDto, ChatResponse } from "@/lib/types";

/** แชตกับ AI ผู้ช่วยของการบ้านชิ้นนี้ (ประวัติเก็บในหน้าเว็บ หายเมื่อปิด) */
export function ChatPanel({ task_id, subject }: { task_id: string; subject: string }) {
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    const next: ChatMessageDto[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError("");
    setSending(true);
    try {
      const data = await api<ChatResponse>("/api/chat", { method: "POST", body: { task_id, messages: next } });
      setMessages([...next, { role: "assistant", content: data.reply }]);
      setRemaining(data.remaining_today);
    } catch (err) {
      // ถอยกลับ เพื่อให้ประวัติยังสลับ user/assistant ถูกต้อง
      setMessages(messages);
      setInput(content);
      setError(err instanceof Error ? err.message : "ส่งคำถามไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
      <h3 className="font-semibold text-violet-800">🤖 พี่ติว AI</h3>
      <p className="text-xs text-violet-600">ช่วยอธิบายให้เข้าใจ {subject} แต่ไม่เฉลยคำตอบให้นะ</p>

      <div className="mt-2 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {messages.map((m, i) => (
          <p
            key={i}
            className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
              m.role === "user" ? "self-end bg-violet-500 text-white" : "self-start bg-white text-slate-800 shadow-sm"
            }`}
          >
            {m.content}
          </p>
        ))}
        {sending ? <p className="self-start rounded-2xl bg-white px-3 py-2 text-sm text-slate-400 shadow-sm">กำลังคิด...</p> : null}
        <div ref={bottom} />
      </div>

      {error ? <p className="mt-2 rounded-xl bg-red-50 p-2 text-sm text-red-600">{error}</p> : null}

      <form onSubmit={onSubmit} className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          aria-label="คำถามถึง AI"
          placeholder="ถามสิ่งที่ไม่เข้าใจ..."
          className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white p-2 text-base"
        />
        <button type="submit" disabled={sending || !input.trim()} className="rounded-xl bg-violet-500 px-4 font-semibold text-white disabled:opacity-50">
          ส่ง
        </button>
      </form>
      {remaining !== null ? <p className="mt-1 text-right text-xs text-violet-500">วันนี้ถามได้อีก {remaining} ครั้ง</p> : null}
    </section>
  );
}
