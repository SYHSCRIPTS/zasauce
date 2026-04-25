"use client";

import { useMemo, useState } from "react";
import { APPS } from "@/lib/os/apps";
import type { AppId } from "@/lib/os/types";
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
  Monitor,
} from "lucide-react";

type Category = "Core" | "Media" | "Productivity" | "System" | "Fun";

type StoreEntry = {
  appId: AppId;
  category: Category;
  description: string;
};

function loadInstalled(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem("zza-os:installed-apps");
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveInstalled(v: Record<string, boolean>) {
  try {
    localStorage.setItem("zza-os:installed-apps", JSON.stringify(v));
  } catch {}
}

export function AppStoreApp() {
  const openApp = useWindowStore((s) => s.openApp);
  const [installed, setInstalled] = useState<Record<string, boolean>>(() => loadInstalled());
  const [cat, setCat] = useState<Category | "All">("All");

  const entries = useMemo<StoreEntry[]>(
    () => [
      { appId: "terminal", category: "Core", description: "Command line interface for the OS." },
      { appId: "file-explorer", category: "System", description: "Browse system folders and files." },
      { appId: "browser", category: "Core", description: "Offline browser with internal pages." },
      { appId: "settings", category: "System", description: "Themes, blur strength, UI scale." },
      { appId: "system-monitor", category: "System", description: "Live cyber dashboard telemetry." },

      { appId: "camera", category: "Media", description: "Capture photos into Gallery." },
      { appId: "camera-scan", category: "System", description: "MediaPipe scan overlay + analysis." },
      { appId: "gallery", category: "Media", description: "Image grid with modal viewer." },
      { appId: "music-player", category: "Media", description: "Ambient loop + visualizer + drop files." },
      { appId: "voice-recorder", category: "Media", description: "Record audio clips. (shell)" },
      { appId: "image-editor", category: "Media", description: "Edit images. (shell)" },

      { appId: "notes", category: "Productivity", description: "Local notes with autosave." },
      { appId: "calendar", category: "Productivity", description: "Schedule panel. (shell)" },
      { appId: "weather-panel", category: "System", description: "Animated weather system." },
      { appId: "map-viewer", category: "Core", description: "Cyber grid map with zoom + pan." },
      { appId: "calculator", category: "Core", description: "Scientific calculator with neon buttons." },
      { appId: "code-editor", category: "Productivity", description: "Editor with tabs + fake console." },
      { appId: "chat-simulator", category: "Core", description: "Chat rooms (BroadcastChannel/WS)." },
      { appId: "game-hub", category: "Fun", description: "Arcade hub + external game links." },
      { appId: "credits", category: "System", description: "OS logo + credits." },
    ],
    [],
  );

  const cats = useMemo<(Category | "All")[]>(
    () => ["All", "Core", "Media", "Productivity", "System", "Fun"],
    [],
  );

  const filtered = useMemo(() => {
    const set = new Set(entries.map((e) => e.appId));
    const defs = APPS.filter((a) => set.has(a.id));
    const byId = new Map(defs.map((d) => [d.id, d]));
    return entries
      .filter((e) => (cat === "All" ? true : e.category === cat))
      .map((e) => ({ entry: e, def: byId.get(e.appId)! }))
      .filter((x) => !!x.def);
  }, [cat, entries]);

  const isInstalled = (appId: AppId) => installed[appId] !== false; // default: installed

  const install = (appId: AppId) => {
    const next = { ...installed, [appId]: true };
    setInstalled(next);
    saveInstalled(next);
  };

  const uninstall = (appId: AppId) => {
    const next = { ...installed, [appId]: false };
    setInstalled(next);
    saveInstalled(next);
  };

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">App Store</div>
        <div className="font-mono text-[11px] text-zinc-300/60">simulated</div>
      </div>

      <div className="mt-3 h-[calc(100%-44px)] rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between gap-3">
          <div className="text-xs tracking-widest text-zinc-200/80">CATEGORIES</div>
          <div className="flex-1 flex items-center gap-2 overflow-x-auto">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={[
                  "shrink-0 rounded-xl border px-3 py-2 text-xs font-mono transition-colors",
                  cat === c
                    ? "border-white/20 bg-black/35 text-zinc-100 shadow-[0_18px_40px_rgba(var(--os-accent),0.12)]"
                    : "border-white/10 bg-black/20 hover:bg-black/30 text-zinc-200/80",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="text-[11px] font-mono text-[rgb(var(--os-accent))]">{filtered.length} apps</div>
        </div>

        <div className="p-4 overflow-auto h-[calc(100%-49px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(({ entry, def }) => {
              const installedNow = isInstalled(def.id);
              return (
                <div
                  key={def.id}
                  className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden"
                >
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-100 truncate">{def.title}</div>
                      <div className="mt-1 text-[11px] font-mono text-zinc-300/60">
                        {entry.category} · {def.id}
                      </div>
                      <div className="mt-3 text-[12px] text-zinc-200/80">{entry.description}</div>
                    </div>
                    <div className="h-10 w-10 rounded-2xl border border-white/40 bg-white/25 flex items-center justify-center">
                      <StoreIcon appId={def.id} />
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex items-center gap-2">
                    {installedNow ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openApp(def.id)}
                          className="rounded-xl border border-white/10 bg-black/25 hover:bg-black/35 px-3 py-2 text-xs os-accent-shadow"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => uninstall(def.id)}
                          className="rounded-xl border border-rose-400/25 bg-black/20 hover:bg-black/30 px-3 py-2 text-xs text-rose-200"
                        >
                          Uninstall
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => install(def.id)}
                        className="rounded-xl border border-white/10 bg-black/25 hover:bg-black/35 px-3 py-2 text-xs os-accent-shadow"
                      >
                        Install
                      </button>
                    )}
                    <div className="ml-auto text-[11px] font-mono text-zinc-300/60">
                      {installedNow ? "installed" : "not installed"}
                    </div>
                  </div>

                  <div className="h-1 w-full bg-gradient-to-r from-[rgba(var(--os-accent),0.0)] via-[rgba(var(--os-accent),0.35)] to-[rgba(var(--os-accent),0.0)] opacity-60" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StoreIcon({ appId }: { appId: AppId }) {
  // keep DO NOT CHANGE icons as text
  if (appId === "terminal") return <span className="text-[12px] font-mono text-slate-900">{" >_"}</span>;
  if (appId === "code-editor") return <span className="text-[12px] font-mono text-slate-900">{"</>"}</span>;

  const cls = "h-5 w-5 drop-shadow-[0_10px_18px_rgba(var(--os-accent),0.10)]";
  if (appId === "settings") return <Settings className="h-6 w-6 text-sky-600 drop-shadow-[0_12px_22px_rgba(56,189,248,0.22)]" />;
  if (appId === "game-hub") return <Gamepad2 className={[cls, "text-purple-600"].join(" ")} />;
  if (appId === "calculator") return <Calculator className={[cls, "text-amber-600"].join(" ")} />;
  if (appId === "chat-simulator") return <MessageCircle className={[cls, "text-emerald-600"].join(" ")} />;
  if (appId === "gallery") return <ImageIcon className={[cls, "text-fuchsia-600"].join(" ")} />;
  if (appId === "file-explorer") return <Folder className={[cls, "text-yellow-600"].join(" ")} />;
  if (appId === "browser") return <Globe className={[cls, "text-sky-600"].join(" ")} />;
  if (appId === "image-editor") return <Brush className={[cls, "text-rose-600"].join(" ")} />;

  if (appId === "music-player") return <Music className={[cls, "text-indigo-600"].join(" ")} />;
  if (appId === "camera") return <Camera className={[cls, "text-teal-600"].join(" ")} />;
  if (appId === "camera-scan") return <Shield className={[cls, "text-emerald-700"].join(" ")} />;
  if (appId === "system-monitor") return <Monitor className={[cls, "text-slate-700"].join(" ")} />;
  if (appId === "app-store") return <Store className={[cls, "text-violet-600"].join(" ")} />;
  if (appId === "voice-recorder") return <Mic className={[cls, "text-rose-600"].join(" ")} />;
  if (appId === "calendar") return <CalendarDays className={[cls, "text-cyan-700"].join(" ")} />;
  if (appId === "map-viewer") return <MapIcon className={[cls, "text-sky-700"].join(" ")} />;
  if (appId === "credits") return <Copyright className={[cls, "text-slate-700"].join(" ")} />;

  return <Store className={[cls, "text-slate-700"].join(" ")} />;
}

