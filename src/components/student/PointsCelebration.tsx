"use client";

import { useEffect, useMemo, type CSSProperties } from "react";

interface Props {
  earned_points: number;
  total_points: number;
  onDone: () => void;
}

const COIN_COUNT = 14;

/** แอนิเมชันรับแต้มแบบเกม: ตัวเลขเด้ง + เหรียญกระจาย (ตัวเลขมาจากเซิร์ฟเวอร์เท่านั้น) */
export function PointsCelebration({ earned_points, total_points, onDone }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, [onDone]);

  const coins = useMemo(
    () =>
      Array.from({ length: COIN_COUNT }, (_, i) => {
        const angle = (i / COIN_COUNT) * Math.PI * 2;
        const distance = 110 + (i % 3) * 35;
        return {
          "--dx": `${Math.cos(angle) * distance}px`,
          "--dy": `${Math.sin(angle) * distance}px`,
          "--rot": `${(i % 2 ? 1 : -1) * 220}deg`,
          animationDelay: `${(i % 4) * 0.06}s`,
        } as CSSProperties;
      }),
    [],
  );

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDone}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-900/80 animate-fade-in"
    >
      <div className="relative flex h-44 w-44 items-center justify-center">
        {coins.map((style, i) => (
          <span key={i} style={style} className="absolute text-3xl animate-coin-burst" aria-hidden>
            🪙
          </span>
        ))}
        {/* แยกสองชั้น เพราะ element เดียวเล่นได้ทีละ animation */}
        <div className="rounded-full animate-glow-pulse">
          <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-2xl animate-points-pop">
            <span className="text-5xl font-black drop-shadow">+{earned_points}</span>
            <span className="text-sm font-bold">แต้ม</span>
          </div>
        </div>
      </div>
      <p className="mt-8 text-2xl font-black text-white animate-points-pop">ภารกิจสำเร็จ! 🎉</p>
      <p className="mt-2 text-amber-200">แต้มรวมของคุณ ⭐ {total_points}</p>
      <p className="mt-6 text-xs text-slate-400">แตะเพื่อปิด</p>
    </div>
  );
}
