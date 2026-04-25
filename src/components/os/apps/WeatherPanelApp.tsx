"use client";

import { useEffect, useMemo, useState } from "react";

type WeatherKind = "sun" | "rain" | "storm";

type Weather = {
  kind: WeatherKind;
  tempC: number;
  humidity: number;
  windKph: number;
  text: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function WeatherPanelApp() {
  const location = "Neo City / Sector-07";
  const [tick, setTick] = useState(0);
  const w: Weather = useMemo(() => {
    const cycle = tick % 30;
    const kind: WeatherKind =
      cycle < 14 ? "sun" : cycle < 24 ? "rain" : "storm";

    const baseTemp = kind === "sun" ? 26 : kind === "rain" ? 21 : 19;
    const tempC = clamp(
      baseTemp + Math.round(Math.sin(tick / 7) * 2),
      8,
      38,
    );

    const humidity =
      kind === "sun"
        ? clamp(38 + (tick % 8) * 2, 25, 55)
        : kind === "rain"
          ? clamp(62 + (tick % 10) * 2, 55, 88)
          : clamp(74 + (tick % 12) * 2, 65, 98);

    const windKph =
      kind === "sun"
        ? clamp(8 + (tick % 5), 4, 18)
        : kind === "rain"
          ? clamp(12 + (tick % 7), 6, 26)
          : clamp(22 + (tick % 9), 14, 40);

    const text =
      kind === "sun"
        ? "Clear grid skies"
        : kind === "rain"
          ? "Neon rain sweep"
          : "Ion storm front";

    return { kind, tempC, humidity, windKph, text };
  }, [tick]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const Icon = useMemo(() => {
    if (w.kind === "sun") return SunIcon;
    if (w.kind === "rain") return RainIcon;
    return StormIcon;
  }, [w.kind]);

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Weather</div>
        <div className="font-mono text-[11px] text-zinc-300/60">
          {location}
        </div>
      </div>

      <div className="mt-3 h-[calc(100%-44px)] rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
          <div className="text-xs tracking-widest text-zinc-200/80">FORECAST</div>
          <div className="text-[11px] font-mono text-[rgb(var(--os-accent))]">
            LIVE
          </div>
        </div>

        <div className="p-4 grid grid-cols-12 gap-3 h-[calc(100%-49px)]">
          <div className="col-span-7 rounded-2xl border border-white/10 bg-black/20 overflow-hidden relative">
            <div className="absolute inset-0 opacity-35">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(56,189,248,0.10)_1px,transparent_1px)] bg-[length:28px_28px]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(56,189,248,0.10)_1px,transparent_1px)] bg-[length:28px_28px]" />
            </div>

            <div className="relative p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-zinc-300/60">status</div>
                <div className="text-xl font-semibold text-zinc-100 os-glow-text">
                  {w.text}
                </div>
                <div className="mt-2 text-[12px] font-mono text-zinc-300/70">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="relative h-28 w-28 rounded-2xl border border-white/10 bg-black/20 flex items-center justify-center os-accent-shadow">
                <Icon />
              </div>
            </div>

            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[rgba(var(--os-accent),0.18)] to-transparent os-scanline" />
          </div>

          <div className="col-span-5 flex flex-col gap-3">
            <Metric label="TEMP" value={`${w.tempC}°C`} />
            <Metric label="HUMID" value={`${w.humidity}%`} />
            <Metric label="WIND" value={`${w.windKph} kph`} />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes floaty {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0px); }
        }
        @keyframes rain {
          0% { transform: translateY(-10px); opacity: 0.0; }
          15% { opacity: 1; }
          100% { transform: translateY(40px); opacity: 0.0; }
        }
        @keyframes flicker {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.55; }
        }
        .floaty { animation: floaty 2.2s ease-in-out infinite; }
        .flicker { animation: flicker 1.1s ease-in-out infinite; }
        .drop { animation: rain 0.9s linear infinite; }
      `}</style>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 os-liquid-edge p-4">
      <div className="text-xs tracking-widest text-zinc-200/80">{label}</div>
      <div className="mt-2 font-mono text-2xl text-zinc-100 os-glow-text tabular-nums">
        {value}
      </div>
    </div>
  );
}

function SunIcon() {
  return (
    <svg className="floaty" width="76" height="76" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="12" stroke="rgba(56,189,248,0.9)" strokeWidth="2.5" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = 32 + Math.cos(a) * 18;
        const y1 = 32 + Math.sin(a) * 18;
        const x2 = 32 + Math.cos(a) * 26;
        const y2 = 32 + Math.sin(a) * 26;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(34,197,94,0.75)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function RainIcon() {
  return (
    <svg className="floaty" width="76" height="76" viewBox="0 0 64 64" fill="none">
      <path
        d="M22 34c-6 0-10-3.8-10-9 0-5 4-9 9-9 1.4-6 6.5-10 13-10 7.2 0 13 5.8 13 13v1c3.8 0.6 7 3.8 7 8 0 4.6-3.7 8-8.3 8H22z"
        stroke="rgba(56,189,248,0.85)"
        strokeWidth="2.2"
      />
      {Array.from({ length: 6 }).map((_, i) => (
        <line
          key={i}
          x1={22 + i * 6}
          y1={40}
          x2={20 + i * 6}
          y2={52}
          className="drop"
          style={{ animationDelay: `${i * 0.12}s` }}
          stroke="rgba(34,197,94,0.75)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function StormIcon() {
  return (
    <svg className="floaty" width="76" height="76" viewBox="0 0 64 64" fill="none">
      <path
        d="M20 34c-6 0-10-3.8-10-9 0-5 4-9 9-9 1.4-6 6.5-10 13-10 7.2 0 13 5.8 13 13v1c3.8 0.6 7 3.8 7 8 0 4.6-3.7 8-8.3 8H20z"
        stroke="rgba(168,85,247,0.85)"
        strokeWidth="2.2"
      />
      <path
        d="M30 40l-6 10h8l-4 10 12-16h-8l4-4h-6z"
        className="flicker"
        fill="rgba(56,189,248,0.85)"
      />
    </svg>
  );
}

