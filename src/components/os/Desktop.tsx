"use client";

import { useState } from "react";
import Image from "next/image";
import { DesktopIconGrid } from "./DesktopIconGrid";
import { Taskbar } from "./Taskbar";
import { WindowLayer } from "./WindowLayer";
import { BootOverlay } from "./BootOverlay";

export function Desktop() {
  const [booted, setBooted] = useState(false);
  return (
    <div
      className="relative flex-1 min-h-[100dvh] w-full overflow-hidden os-desktop-bg"
      style={{ transform: "scale(var(--os-scale))", transformOrigin: "top left" }}
    >
      {!booted && <BootOverlay onDone={() => setBooted(true)} />}
      <div className="absolute inset-0 os-scanlines" />

      <header className="pointer-events-none absolute top-0 left-0 right-0 z-10 p-6">
        <div className="pointer-events-auto inline-flex items-center gap-3 rounded-2xl os-glass os-liquid-edge px-4 py-3">
          <div className="relative h-8 w-8 rounded-2xl overflow-hidden border border-white/55 bg-white/25 shadow-[0_8px_20px_rgba(15,23,42,0.10)]">
            <Image src="/os-logo.jpg" alt="OS logo" fill className="object-cover" priority />
          </div>
          <div className="text-sm tracking-[0.25em] text-[color:var(--foreground)] os-glow-text">
            ZZAAKKKIIRRR OS
          </div>
          <div className="text-xs text-[color:color-mix(in srgb, var(--foreground) 65%, transparent)]">
            glass
          </div>
        </div>
      </header>

      <main className="relative z-0 pt-24 pb-28 overflow-auto max-h-[calc(100dvh-0px)]">
        <DesktopIconGrid />
      </main>

      <WindowLayer />
      <Taskbar />
    </div>
  );
}

