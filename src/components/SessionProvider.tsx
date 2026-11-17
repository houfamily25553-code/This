"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/client/api";
import type { MeResponse } from "@/lib/types";

interface SessionValue {
  status: "loading" | "ready" | "error";
  me: MeResponse | null;
  error: string;
  /** โหลดข้อมูลผู้ใช้ใหม่ (เช่น หลังเข้าห้อง/ออกจากห้อง) */
  refresh: () => Promise<MeResponse | null>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionValue["status"]>("loading");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await api<MeResponse>("/api/me");
      setMe(data);
      setStatus("ready");
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      setStatus("error");
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ status, me, error, refresh }), [status, me, error, refresh]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession ต้องใช้ภายใน <SessionProvider>");
  return value;
}
