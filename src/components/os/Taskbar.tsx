"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useWindowStore } from "@/lib/os/windowStore";

function Clock() {
  const [time, setTime] = useState<string>("--:--");

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span suppressHydrationWarning className="tabular-nums">
      {time}
    </span>
  );
}

export function Taskbar() {
  const windows = useWindowStore((s) => s.windows);
  const activeWindowId = useWindowStore((s) => s.activeWindowId);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const restoreWindow = useWindowStore((s) => s.restoreWindow);

  const ordered = useMemo(() => {
    return [...windows].sort((a, b) => a.zIndex - b.zIndex);
  }, [windows]);

  return (
    <div className="pointer-events-auto fixed bottom-0 left-0 right-0 z-[1000] p-3">
      <div className="os-glass os-liquid-edge mx-auto max-w-5xl rounded-2xl px-3 py-2 flex items-center gap-2">
        <div className="flex items-center gap-2 pr-2">
          <div className="relative h-7 w-7 rounded-xl overflow-hidden border border-white/55 bg-white/25 shadow-[0_10px_18px_rgba(15,23,42,0.10)]">
            <Image src="/os-logo.jpg" alt="OS logo" fill className="object-cover" />
          </div>
          <div className="text-xs tracking-widest text-[color:var(--foreground)] os-glow-text">
            ZZAAKKKIIRRR OS
          </div>
        </div>

        <div className="flex-1 flex items-center gap-2 overflow-x-auto">
          {ordered.length === 0 ? (
            <div className="text-xs text-[color:color-mix(in srgb, var(--foreground) 60%, transparent)]">
              No apps running
            </div>
          ) : (
            ordered.map((w) => {
              const isActive = w.id === activeWindowId && !w.isMinimized;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    if (w.isMinimized) restoreWindow(w.id);
                    else if (isActive) minimizeWindow(w.id);
                    else focusWindow(w.id);
                  }}
                  className={[
                    "shrink-0 rounded-xl px-3 py-2 text-xs transition-colors",
                    "border border-white/10 bg-black/25 hover:bg-black/35",
                    isActive
                      ? "text-[color:var(--foreground)] shadow-[0_18px_40px_rgba(var(--os-accent),0.14)]"
                      : "text-[color:color-mix(in srgb, var(--foreground) 78%, transparent)]",
                    "os-hover-glow",
                  ].join(" ")}
                  title={w.title}
                >
                  {w.title}
                </button>
              );
            })
          )}
        </div>

        <div className="pl-2 text-xs text-[color:color-mix(in srgb, var(--foreground) 65%, transparent)]">
          <Clock />
        </div>
      </div>
    </div>
  );
}

