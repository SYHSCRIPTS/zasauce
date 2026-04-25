"use client";

import { useEffect, useMemo, useState } from "react";

type Step = { label: string; ms: number };

export function BootOverlay({ onDone }: { onDone: () => void }) {
  const steps = useMemo<Step[]>(
    () => [
      { label: "ZZAAKKIIRRR OS booting…", ms: 650 },
      { label: "loading kernel modules…", ms: 520 },
      { label: "starting window manager…", ms: 520 },
      { label: "mounting apps registry…", ms: 520 },
      { label: "initializing midnight glass…", ms: 520 },
    ],
    [],
  );

  const [idx, setIdx] = useState(0);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      for (let i = 0; i < steps.length; i += 1) {
        if (!alive) return;
        setIdx(i);
        setGlitch(true);
        await new Promise((r) => window.setTimeout(r, 90));
        setGlitch(false);
        await new Promise((r) => window.setTimeout(r, steps[i]!.ms));
      }
      if (!alive) return;
      setGlitch(true);
      await new Promise((r) => window.setTimeout(r, 160));
      setGlitch(false);
      await new Promise((r) => window.setTimeout(r, 220));
      onDone();
    })();
    return () => {
      alive = false;
    };
  }, [onDone, steps]);

  const pct = Math.round(((idx + 1) / steps.length) * 100);
  const label = steps[idx]?.label ?? "booting…";

  return (
    <div className="fixed inset-0 z-[5000] bg-black/85 backdrop-blur-xl flex items-center justify-center p-8">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-black/30 os-liquid-edge overflow-hidden os-accent-shadow">
        <div className="px-6 py-5 border-b border-white/10 bg-black/20 flex items-center justify-between">
          <div className={["text-sm font-semibold tracking-[0.28em] text-zinc-100", glitch ? "os-glitch" : ""].join(" ")}>
            ZZAAKKIIRRR OS
          </div>
          <div className="text-[11px] font-mono text-[rgb(var(--os-accent))]">BOOT</div>
        </div>

        <div className="p-6">
          <div className={["font-mono text-[12px] text-zinc-200/80 whitespace-pre-wrap", glitch ? "os-glitch" : ""].join(" ")}>
            {label}
          </div>

          <div className="mt-4 h-2 rounded-full border border-white/10 bg-black/25 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[rgba(var(--os-accent),0.12)] via-[rgba(var(--os-accent),0.82)] to-[rgba(var(--os-accent),0.12)] transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-[11px] font-mono text-zinc-300/60">startup sequence</div>
            <div className="text-[11px] font-mono text-zinc-300/60 tabular-nums">{pct}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

