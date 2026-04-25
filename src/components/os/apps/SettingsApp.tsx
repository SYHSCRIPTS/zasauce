"use client";

import { useMemo } from "react";
import { useSettingsStore, type ThemePreset } from "@/lib/os/settingsStore";

export function SettingsApp() {
  const settings = useSettingsStore((s) => s.settings);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setScanOverlayIntensity = useSettingsStore((s) => s.setScanOverlayIntensity);
  const setSoundEffects = useSettingsStore((s) => s.setSoundEffects);
  const setBlurStrength = useSettingsStore((s) => s.setBlurStrength);
  const setUiScale = useSettingsStore((s) => s.setUiScale);

  const blurLabel = useMemo(() => `${Math.round(settings.blurStrength)}px`, [settings.blurStrength]);
  const scaleLabel = useMemo(() => `${Math.round(settings.uiScale * 100)}%`, [settings.uiScale]);

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Settings</div>
        <div className="text-[11px] font-mono text-zinc-300/60">midnight · liquid glass</div>
      </div>

      <div className="mt-3 grid grid-cols-12 gap-3 h-[calc(100%-44px)]">
        <Section title="Theme Presets" className="col-span-6">
          <div className="grid grid-cols-3 gap-2">
            <ThemeButton
              label="Neon Green"
              preset="neon-green"
              active={settings.theme === "neon-green"}
              onClick={() => setTheme("neon-green")}
            />
            <ThemeButton
              label="Cyber Blue"
              preset="cyber-blue"
              active={settings.theme === "cyber-blue"}
              onClick={() => setTheme("cyber-blue")}
            />
            <ThemeButton
              label="Red Alert"
              preset="red-alert"
              active={settings.theme === "red-alert"}
              onClick={() => setTheme("red-alert")}
            />
          </div>
          <div className="mt-3 text-[11px] text-zinc-300/60">
            Accent color updates across the OS (glows, highlights).
          </div>
        </Section>

        <Section title="Toggles" className="col-span-6">
          <ToggleRow
            label="Sound effects"
            value={settings.soundEffects}
            onChange={setSoundEffects}
          />
          <div className="mt-3">
            <LabelRow label="Scan overlay intensity" value={`${Math.round(settings.scanOverlayIntensity * 100)}%`} />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.scanOverlayIntensity * 100)}
              onChange={(e) => setScanOverlayIntensity(Number(e.target.value) / 100)}
              className="mt-2 w-full"
              style={{ accentColor: `rgb(var(--os-accent))` }}
            />
          </div>
          <div className="mt-3">
            <LabelRow label="Blur strength" value={blurLabel} />
            <input
              type="range"
              min={6}
              max={28}
              value={Math.round(settings.blurStrength)}
              onChange={(e) => setBlurStrength(Number(e.target.value))}
              className="mt-2 w-full"
              style={{ accentColor: `rgb(var(--os-accent))` }}
            />
          </div>
        </Section>

        <Section title="UI Scale" className="col-span-12">
          <LabelRow label="Scale" value={scaleLabel} />
          <input
            type="range"
            min={85}
            max={115}
            value={Math.round(settings.uiScale * 100)}
            onChange={(e) => setUiScale(Number(e.target.value) / 100)}
            className="mt-2 w-full"
            style={{ accentColor: `rgb(var(--os-accent))` }}
          />
          <div className="mt-2 text-[11px] text-zinc-300/60">
            Scales the desktop UI (useful for different screen sizes).
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={["rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden", className ?? ""].join(" ")}>
      <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
        <div className="text-xs tracking-widest text-zinc-200/80">{title}</div>
        <div className="h-2 w-2 rounded-full bg-[rgb(var(--os-accent))] shadow-[0_0_18px_rgba(var(--os-accent),0.22)]" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ThemeButton({
  label,
  preset,
  active,
  onClick,
}: {
  label: string;
  preset: ThemePreset;
  active: boolean;
  onClick: () => void;
}) {
  const chip =
    preset === "neon-green"
      ? "bg-emerald-400"
      : preset === "red-alert"
        ? "bg-rose-400"
        : "bg-sky-400";
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border px-3 py-3 text-left transition-colors",
        active ? "border-white/25 bg-black/30" : "border-white/10 bg-black/20 hover:bg-black/25",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-zinc-100">{label}</div>
        <div className={["h-2.5 w-2.5 rounded-full", chip, "shadow-[0_0_18px_rgba(255,255,255,0.12)]"].join(" ")} />
      </div>
      <div className="mt-2 text-[11px] font-mono text-zinc-300/60">{preset}</div>
    </button>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-zinc-100/90">{label}</div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={[
          "h-8 w-14 rounded-full border transition-colors relative",
          value ? "border-white/15 bg-[rgba(var(--os-accent),0.22)]" : "border-white/10 bg-black/20",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-6 w-6 rounded-full bg-white/85 shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition-transform",
            value ? "translate-x-7" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function LabelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-zinc-100/90">{label}</div>
      <div className="text-[11px] font-mono text-zinc-300/60">{value}</div>
    </div>
  );
}

