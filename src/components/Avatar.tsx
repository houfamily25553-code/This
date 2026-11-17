export function Avatar({ src, name, size = 40 }: { src: string; name: string; size?: number }) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className="shrink-0 rounded-full bg-slate-200 object-cover" />;
  }
  return (
    <div style={style} className="flex shrink-0 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-600">
      {name.trim().charAt(0) || "?"}
    </div>
  );
}
