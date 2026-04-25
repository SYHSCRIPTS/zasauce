"use client";

import { APPS } from "@/lib/os/apps";
import { useWindowStore } from "@/lib/os/windowStore";
import {
  Brush,
  Calculator,
  CalendarDays,
  Camera,
  Copyright,
  Folder,
  Gamepad2,
  Globe,
  Image as ImageIcon,
  Map as MapIcon,
  MessageCircle,
  Mic,
  Music,
  Settings,
  Shield,
  Store,
  Terminal,
  Monitor,
} from "lucide-react";

function AppIcon({ appId }: { appId: string }) {
  // DO NOT CHANGE: Terminal + Code Editor icons.
  if (appId === "terminal") return <span className="text-[12px] font-mono text-slate-900 os-glow-text">{" >_"}</span>;
  if (appId === "code-editor") return <span className="text-[12px] font-mono text-slate-900 os-glow-text">{"</>"}</span>;

  const base = "h-5 w-5";
  const glow = "drop-shadow-[0_12px_24px_rgba(var(--os-accent),0.12)]";

  if (appId === "settings") return <Settings className="h-6 w-6 text-sky-600 drop-shadow-[0_14px_26px_rgba(56,189,248,0.28)]" />;
  if (appId === "game-hub") return <Gamepad2 className={[base, "text-purple-600", glow].join(" ")} />;
  if (appId === "calculator") return <Calculator className={[base, "text-amber-600", glow].join(" ")} />;
  if (appId === "chat-simulator") return <MessageCircle className={[base, "text-emerald-600", glow].join(" ")} />;
  if (appId === "gallery") return <ImageIcon className={[base, "text-fuchsia-600", glow].join(" ")} />;
  if (appId === "file-explorer") return <Folder className={[base, "text-yellow-600", glow].join(" ")} />;
  if (appId === "browser") return <Globe className={[base, "text-sky-600", glow].join(" ")} />;
  if (appId === "image-editor") return <Brush className={[base, "text-rose-600", glow].join(" ")} />;

  // other apps
  if (appId === "music-player") return <Music className={[base, "text-indigo-600", glow].join(" ")} />;
  if (appId === "camera") return <Camera className={[base, "text-teal-600", glow].join(" ")} />;
  if (appId === "camera-scan") return <Shield className={[base, "text-emerald-700", glow].join(" ")} />;
  if (appId === "system-monitor") return <Monitor className={[base, "text-slate-700", glow].join(" ")} />;
  if (appId === "app-store") return <Store className={[base, "text-violet-600", glow].join(" ")} />;
  if (appId === "voice-recorder") return <Mic className={[base, "text-rose-600", glow].join(" ")} />;
  if (appId === "calendar") return <CalendarDays className={[base, "text-cyan-700", glow].join(" ")} />;
  if (appId === "map-viewer") return <MapIcon className={[base, "text-sky-700", glow].join(" ")} />;
  if (appId === "credits") return <Copyright className={[base, "text-slate-700", glow].join(" ")} />;

  // fallback
  return <Terminal className={[base, "text-slate-700", glow].join(" ")} />;
}

export function DesktopIconGrid() {
  const openApp = useWindowStore((s) => s.openApp);

  return (
    <div className="pointer-events-auto select-none">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6">
        {APPS.map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => openApp(app.id)}
            className={[
              "group flex flex-col items-center gap-2 rounded-2xl p-3",
              "text-slate-700 hover:text-slate-900",
              "transition-transform duration-200 active:scale-[0.98]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--os-accent),0.35)]",
            ].join(" ")}
          >
            <div
              className={[
                "os-glass os-liquid-edge",
                app.id === "settings" ? "h-14 w-14" : "h-12 w-12",
                "rounded-2xl flex items-center justify-center",
                "border border-white/50 bg-white/30",
                "transition-[transform,box-shadow] duration-200",
                "group-hover:scale-[1.06] group-hover:shadow-[0_18px_50px_rgba(var(--os-accent),0.10)]",
              ].join(" ")}
            >
              <AppIcon appId={app.id} />
            </div>
            <div className="text-[12px] leading-4 tracking-wide text-center">
              {app.title}
            </div>
          </button>
        ))}
      </div>
      <div className="px-6 pb-3 text-[11px] text-slate-600">
        Tip: single-click an icon to open.
      </div>
    </div>
  );
}

