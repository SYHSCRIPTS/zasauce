"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WindowInstance } from "@/lib/os/types";
import { useWindowStore } from "@/lib/os/windowStore";
import { AppShell } from "./apps/AppShell";

type DragState =
  | { type: "none" }
  | {
      type: "move";
      pointerId: number;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    };

export function WindowChrome({ win }: { win: WindowInstance }) {
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const setWindowRect = useWindowStore((s) => s.setWindowRect);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const setClosing = useWindowStore((s) => s.setClosing);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState>({ type: "none" });
  const [didAnimateIn, setDidAnimateIn] = useState(false);

  const style = useMemo(() => {
    if (win.isMaximized) {
      return {
        left: 10,
        top: 10,
        width: "calc(100vw - 20px)",
        height: "calc(100vh - 88px)", // leave room for taskbar
      } as const;
    }
    return {
      left: win.rect.x,
      top: win.rect.y,
      width: win.rect.w,
      height: win.rect.h,
    } as const;
  }, [win.isMaximized, win.rect.h, win.rect.w, win.rect.x, win.rect.y]);

  useEffect(() => {
    if (drag.type === "none") return;

    const onMove = (e: PointerEvent) => {
      if (drag.type !== "move") return;
      if (e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setWindowRect(win.id, { x: drag.originX + dx, y: drag.originY + dy });
    };

    const onUp = (e: PointerEvent) => {
      if (drag.type !== "move") return;
      if (e.pointerId !== drag.pointerId) return;
      setDrag({ type: "none" });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, setWindowRect, win.id]);

  useEffect(() => {
    const t = window.setTimeout(() => setDidAnimateIn(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  if (win.isMinimized) return null;

  return (
    <div
      ref={rootRef}
      className={[
        "fixed rounded-2xl overflow-hidden os-glass os-liquid-edge",
        didAnimateIn ? "os-window-in" : "opacity-0 scale-[0.965]",
        "transition-[opacity,transform,width,height,left,top] duration-200 ease-out",
        win.isClosing ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100",
        "os-hover-glow",
      ].join(" ")}
      style={{ ...style, zIndex: win.zIndex }}
      onPointerDown={() => focusWindow(win.id)}
    >
      <div
        className={[
          "h-10 px-3 flex items-center justify-between",
          "bg-[var(--glass-strong)] border-b border-white/10",
          "cursor-grab active:cursor-grabbing select-none",
        ].join(" ")}
        onPointerDown={(e) => {
          if (win.isMaximized) return;
          // Don't start drag when clicking window control buttons.
          if ((e.target as HTMLElement | null)?.closest?.("[data-win-control='true']"))
            return;
          focusWindow(win.id);
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          setDrag({
            type: "move",
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            originX: win.rect.x,
            originY: win.rect.y,
          });
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-2 w-2 rounded-full bg-[rgb(var(--os-accent))] shadow-[0_12px_18px_rgba(var(--os-accent),0.28)]"
            aria-hidden="true"
          />
          <div className="text-xs tracking-wide text-[color:var(--foreground)] os-glow-text truncate">
            {win.title}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <WinButton label="Minimize" onClick={() => minimizeWindow(win.id)}>
            —
          </WinButton>
          <WinButton label={win.isMaximized ? "Restore" : "Maximize"} onClick={() => toggleMaximize(win.id)}>
            {win.isMaximized ? "❐" : "▢"}
          </WinButton>
          <WinButton
            label="Close"
            danger
            onClick={() => {
              setClosing(win.id, true);
              window.setTimeout(() => closeWindow(win.id), 170);
            }}
          >
            ✕
          </WinButton>
        </div>
      </div>

      <div className="h-[calc(100%-40px)] bg-[var(--glass)] overflow-hidden">
        <div className="h-full w-full overflow-auto">
          <AppShell appId={win.appId} />
        </div>
      </div>
    </div>
  );
}

function WinButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-win-control="true"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={[
        "h-7 w-9 rounded-lg text-xs",
        "border border-white/10 bg-black/20 hover:bg-black/25",
        "text-[color:var(--foreground)]",
        danger ? "hover:border-rose-400/30 hover:text-rose-600" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

