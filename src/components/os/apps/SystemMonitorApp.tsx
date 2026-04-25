"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Metrics = {
  cpu: number; // 0..100
  ram: number; // 0..100
  net: number; // 0..100
  tempC: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function fmtPct(n: number) {
  return `${Math.round(n)}%`;
}

export function SystemMonitorApp() {
  const [metrics, setMetrics] = useState<Metrics>({
    cpu: 18,
    ram: 42,
    net: 8,
    tempC: 46,
  });

  // Keep a scrolling CPU graph (last 60 samples).
  const [cpuSeries, setCpuSeries] = useState<number[]>(() =>
    Array.from({ length: 60 }, () => 12),
  );

  const phaseRef = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      phaseRef.current += 1;
      const t = phaseRef.current;

      // Fake signals: smooth base + occasional spikes.
      const baseCpu = 22 + Math.sin(t / 5) * 10 + Math.sin(t / 17) * 6;
      const spike = (t % 13 === 0 ? 28 : 0) + (t % 29 === 0 ? 22 : 0);
      const cpu = clamp(baseCpu + spike + Math.random() * 6, 0, 100);

      const ramTarget = clamp(48 + Math.sin(t / 23) * 7 + (cpu - 30) * 0.12, 18, 92);
      const ram = clamp(lerp(metrics.ram, ramTarget, 0.22), 0, 100);

      const netTarget = clamp(8 + Math.abs(Math.sin(t / 3)) * 22 + (cpu > 60 ? 20 : 0) + Math.random() * 8, 0, 100);
      const net = clamp(lerp(metrics.net, netTarget, 0.35), 0, 100);

      const tempTarget = clamp(44 + (cpu / 100) * 22 + Math.sin(t / 11) * 1.5, 35, 92);
      const tempC = clamp(lerp(metrics.tempC, tempTarget, 0.18), 30, 99);

      setMetrics({ cpu, ram, net, tempC });
      setCpuSeries((s) => [...s.slice(1), cpu]);
    }, 1000);
    return () => window.clearInterval(id);
  }, [metrics.net, metrics.ram, metrics.tempC]);

  const cpuMax = useMemo(() => Math.max(...cpuSeries, 1), [cpuSeries]);

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">System Monitor</div>
        <div className="font-mono text-[11px] text-emerald-300/70">
          LIVE · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-12 gap-3 h-[calc(100%-44px)]">
        {/* CPU Graph */}
        <div className="col-span-8 rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
            <div className="text-xs tracking-widest text-zinc-200/80">CPU</div>
            <div className="font-mono text-[12px] text-emerald-200/90">{fmtPct(metrics.cpu)}</div>
          </div>
          <div className="p-4 h-[calc(100%-49px)]">
            <div className="relative h-full rounded-2xl border border-emerald-400/15 bg-gradient-to-b from-emerald-400/5 to-transparent overflow-hidden">
              {/* grid */}
              <div className="absolute inset-0 opacity-40">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,197,94,0.10)_1px,transparent_1px)] bg-[length:24px_24px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(34,197,94,0.10)_1px,transparent_1px)] bg-[length:24px_24px]" />
              </div>

              {/* polyline */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cpuLine" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="rgba(52,211,153,0.95)" />
                    <stop offset="1" stopColor="rgba(56,189,248,0.45)" />
                  </linearGradient>
                  <linearGradient id="cpuFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="rgba(52,211,153,0.25)" />
                    <stop offset="1" stopColor="rgba(52,211,153,0.00)" />
                  </linearGradient>
                </defs>
                <path
                  d={cpuPath(cpuSeries)}
                  fill="none"
                  stroke="url(#cpuLine)"
                  strokeWidth="2.5"
                />
                <path
                  d={cpuArea(cpuSeries)}
                  fill="url(#cpuFill)"
                  stroke="none"
                />
              </svg>

              {/* glow scan */}
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-emerald-400/20 to-transparent os-scanline" />

              <div className="absolute bottom-3 left-3 font-mono text-[11px] text-zinc-200/60">
                peak {Math.round(cpuMax)}%
              </div>
            </div>
          </div>
        </div>

        {/* Right stack */}
        <div className="col-span-4 flex flex-col gap-3">
          <Panel title="RAM" value={fmtPct(metrics.ram)} accent="sky">
            <Bar value={metrics.ram} />
          </Panel>

          <Panel title="NETWORK" value={fmtPct(metrics.net)} accent="emerald">
            <Meter value={metrics.net} />
          </Panel>

          <Panel title="TEMP" value={`${Math.round(metrics.tempC)}°C`} accent="rose">
            <div className="flex items-end justify-between">
              <div className="text-[11px] text-zinc-200/60 font-mono">core</div>
              <div className="text-[11px] text-zinc-200/60 font-mono">
                {metrics.tempC > 75 ? "HOT" : metrics.tempC > 60 ? "WARM" : "OK"}
              </div>
            </div>
            <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-[12px] text-zinc-100/90">
              {Math.round(metrics.tempC)}.{Math.floor((metrics.tempC * 10) % 10)}°C
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function cpuPath(series: number[]) {
  const w = 600;
  const h = 200;
  const n = series.length;
  const step = w / Math.max(1, n - 1);
  return series
    .map((v, i) => {
      const x = i * step;
      const y = h - (clamp(v, 0, 100) / 100) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function cpuArea(series: number[]) {
  const w = 600;
  const h = 200;
  const n = series.length;
  const step = w / Math.max(1, n - 1);
  const top = series
    .map((v, i) => {
      const x = i * step;
      const y = h - (clamp(v, 0, 100) / 100) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  return `${top} L ${w} ${h} L 0 ${h} Z`;
}

function Panel({
  title,
  value,
  accent,
  children,
}: {
  title: string;
  value: string;
  accent: "sky" | "emerald" | "rose";
  children: React.ReactNode;
}) {
  const glow =
    accent === "sky"
      ? "shadow-[0_18px_40px_rgba(56,189,248,0.12)]"
      : accent === "emerald"
        ? "shadow-[0_18px_40px_rgba(52,211,153,0.12)]"
        : "shadow-[0_18px_40px_rgba(244,63,94,0.10)]";

  return (
    <div className={["rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden", glow].join(" ")}>
      <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
        <div className="text-xs tracking-widest text-zinc-200/80">{title}</div>
        <div className="font-mono text-[12px] text-zinc-100/90">{value}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Bar({ value }: { value: number }) {
  const v = clamp(value, 0, 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-zinc-200/60 font-mono">used</div>
        <div className="text-[11px] text-sky-200/80 font-mono">{Math.round(v)}%</div>
      </div>
      <div className="h-3 rounded-full border border-white/10 bg-black/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400/60 to-emerald-300/50 transition-[width] duration-700"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function Meter({ value }: { value: number }) {
  const v = clamp(value, 0, 100);
  const bars = 12;
  const lit = Math.round((v / 100) * bars);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-zinc-200/60 font-mono">activity</div>
        <div className="text-[11px] text-emerald-200/80 font-mono">{Math.round(v)}%</div>
      </div>
      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={[
              "h-6 rounded-lg border",
              i < lit
                ? "border-emerald-300/25 bg-emerald-300/25 shadow-[0_10px_24px_rgba(52,211,153,0.12)]"
                : "border-white/10 bg-black/20",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

