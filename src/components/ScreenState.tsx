import type { ReactNode } from "react";

export function LoadingScreen({ label = "กำลังโหลด..." }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-slate-500">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function MessageScreen({ title, detail, children }: { title: string; detail?: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      {detail ? <p className="text-sm text-slate-500">{detail}</p> : null}
      {children}
    </div>
  );
}
