"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { api } from "@/lib/client/api";
import { formatBangkok } from "@/lib/time";
import type { TaskSubmissionsResponse } from "@/lib/types";

/** ตารางว่าใครส่งแล้ว / ยังไม่ส่ง ของงานหนึ่งชิ้น */
export function SubmissionTable({ task_id }: { task_id: string }) {
  const [data, setData] = useState<TaskSubmissionsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<TaskSubmissionsResponse>(`/api/admin/tasks/${task_id}/submissions`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "โหลดรายชื่อไม่สำเร็จ");
      });
    return () => {
      cancelled = true;
    };
  }, [task_id]);

  if (error) return <p className="p-3 text-sm text-red-600">{error}</p>;
  if (!data) return <p className="p-3 text-sm text-slate-500">กำลังโหลดรายชื่อ...</p>;
  if (data.members.length === 0) return <p className="p-3 text-sm text-slate-500">ยังไม่มีสมาชิกในห้อง</p>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
          <th className="py-2 font-medium">นักเรียน</th>
          <th className="py-2 text-right font-medium">สถานะ</th>
        </tr>
      </thead>
      <tbody>
        {data.members.map((m) => (
          <tr key={m.line_user_id} className="border-b border-slate-100 last:border-0">
            <td className="py-2">
              <div className="flex items-center gap-2">
                <Avatar src={m.picture_url} name={m.display_name} size={28} />
                <span className="break-all">
                  {m.display_name}
                  {m.role === "admin" ? " 👑" : ""}
                </span>
              </div>
            </td>
            <td className="py-2 text-right">
              {m.submitted ? (
                <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  ส่งแล้ว{m.submitted_at ? ` · ${formatBangkok(m.submitted_at)}` : ""}
                </span>
              ) : (
                <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">ยังไม่ส่ง</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
