import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homework Quest — ระบบการบ้านห้องเรียน",
  description: "จัดการการบ้าน แจ้งเตือนผ่าน LINE และสะสมแต้มแบบเกม",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0ea5e9",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>
        <SessionProvider>
          <div className="mx-auto min-h-dvh w-full max-w-md">{children}</div>
        </SessionProvider>
      </body>
    </html>
  );
}
