"use client";

import { useMemo, useRef, useState } from "react";

type RouteId = "home" | "search" | "news" | "downloads" | "system-portal";

type Route = { id: RouteId; title: string; url: string; hint: string };

const ROUTES: Route[] = [
  { id: "home", title: "Home", url: "zza://home", hint: "Start page" },
  { id: "search", title: "Search", url: "zza://search?q=", hint: "Offline search" },
  { id: "news", title: "News", url: "zza://news", hint: "System bulletins" },
  { id: "downloads", title: "Downloads", url: "zza://downloads", hint: "Local downloads" },
  { id: "system-portal", title: "System Portal", url: "zza://system", hint: "OS portal" },
];

function normalizeUrl(input: string): string {
  const v = input.trim();
  if (!v) return "zza://home";
  // Allow short names: home, search, news...
  const key = v.toLowerCase();
  const byId = ROUTES.find((r) => r.id === (key as RouteId));
  if (byId) return byId.url;
  if (key === "system" || key === "portal") return "zza://system";
  if (key.startsWith("zza://")) return v;
  // Treat everything else as a search query.
  return `zza://search?q=${encodeURIComponent(v)}`;
}

function routeFromUrl(url: string): { route: RouteId; params: Record<string, string> } {
  const u = url.trim();
  if (u.startsWith("zza://search")) {
    const q = u.split("?q=")[1] ?? "";
    return { route: "search", params: { q: decodeURIComponent(q) } };
  }
  if (u.startsWith("zza://news")) return { route: "news", params: {} };
  if (u.startsWith("zza://downloads")) return { route: "downloads", params: {} };
  if (u.startsWith("zza://system")) return { route: "system-portal", params: {} };
  return { route: "home", params: {} };
}

export function BrowserApp() {
  const [address, setAddress] = useState("zza://home");
  const [history, setHistory] = useState<string[]>(["zza://home"]);
  const [idx, setIdx] = useState(0);

  const [transitionKey, setTransitionKey] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");

  const currentUrl = history[idx] ?? "zza://home";
  const { route, params } = useMemo(() => routeFromUrl(currentUrl), [currentUrl]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  // Keep address bar "controlled" without a sync effect (eslint rule).
  // We only update it on explicit navigation/back/forward and keep user edits otherwise.

  const navigate = (raw: string, direction: "fwd" | "back" = "fwd") => {
    const url = normalizeUrl(raw);
    setDir(direction);
    setHistory((h) => {
      const next = [...h.slice(0, idx + 1), url];
      return next;
    });
    setIdx((i) => i + 1);
    setAddress(url);
    setTransitionKey((k) => k + 1);
  };

  const goBack = () => {
    if (idx <= 0) return;
    setDir("back");
    const nextIdx = idx - 1;
    setIdx(nextIdx);
    setAddress(history[nextIdx] ?? "zza://home");
    setTransitionKey((k) => k + 1);
  };

  const goForward = () => {
    if (idx >= history.length - 1) return;
    setDir("fwd");
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    setAddress(history[nextIdx] ?? "zza://home");
    setTransitionKey((k) => k + 1);
  };

  const refresh = () => {
    setDir("fwd");
    setAddress(currentUrl);
    setTransitionKey((k) => k + 1);
  };

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="h-full w-full rounded-2xl os-glass os-liquid-edge border border-white/10 overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-black/20">
          <Btn disabled={idx <= 0} onClick={goBack} title="Back">
            ←
          </Btn>
          <Btn disabled={idx >= history.length - 1} onClick={goForward} title="Forward">
            →
          </Btn>
          <Btn onClick={refresh} title="Refresh">
            ↻
          </Btn>

          <div className="flex-1 flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 pl-1">
              {ROUTES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => navigate(r.url, "fwd")}
                  className={[
                    "rounded-xl px-3 py-2 text-xs border transition-colors",
                    "border-white/10 bg-black/20 hover:bg-black/30",
                    route === r.id ? "text-sky-200 shadow-[0_16px_40px_rgba(56,189,248,0.14)]" : "text-zinc-200/80",
                  ].join(" ")}
                  title={r.hint}
                >
                  {r.title}
                </button>
              ))}
            </div>

            <div className="flex-1">
              <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 flex items-center gap-2">
                <div className="font-mono text-[11px] text-emerald-300/80">ZZA</div>
                <input
                  ref={inputRef}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      navigate(address, "fwd");
                      e.preventDefault();
                    }
                    if (e.key === "Escape") {
                      setAddress(currentUrl);
                      inputRef.current?.blur();
                    }
                  }}
                  className="w-full bg-transparent outline-none font-mono text-[12px] text-zinc-100 placeholder:text-zinc-400"
                  placeholder="Type: home | search cats | news | downloads | system"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              <div className="mt-1 text-[11px] text-zinc-300/60">
                Offline mode. No real internet.
              </div>
            </div>
          </div>
        </div>

        <div className="relative h-[calc(100%-72px)] overflow-hidden">
          <div
            key={transitionKey}
            className={[
              "absolute inset-0 p-4",
              "transition-all duration-250 ease-out",
              "opacity-100 translate-x-0",
              "animate-[browserIn_250ms_ease-out_both]",
            ].join(" ")}
            style={
              {
                // slide direction
                "--fromX": dir === "fwd" ? "12px" : "-12px",
              } as React.CSSProperties
            }
          >
            <BrowserPage route={route} params={params} onNavigate={navigate} />
          </div>
        </div>
      </div>

      {/* local keyframes (no deps) */}
      <style jsx>{`
        @keyframes browserIn {
          from {
            opacity: 0;
            transform: translateX(var(--fromX)) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        "h-9 w-9 rounded-xl border text-sm transition-colors",
        "border-white/10 bg-black/20 hover:bg-black/30",
        "disabled:opacity-40 disabled:hover:bg-black/20",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs tracking-widest text-zinc-200/80">{title}</div>
      <div className="mt-2 text-sm text-zinc-100/90">{children}</div>
    </div>
  );
}

function BrowserPage({
  route,
  params,
  onNavigate,
}: {
  route: RouteId;
  params: Record<string, string>;
  onNavigate: (raw: string) => void;
}) {
  if (route === "home") {
    return (
      <div className="space-y-4">
        <div className="text-lg font-semibold os-glow-text">ZZA Browser</div>
        <Card title="Quick links">
          <div className="flex flex-wrap gap-2">
            <QuickLink label="Search" onClick={() => onNavigate("zza://search?q=")} />
            <QuickLink label="News" onClick={() => onNavigate("zza://news")} />
            <QuickLink label="Downloads" onClick={() => onNavigate("zza://downloads")} />
            <QuickLink label="System Portal" onClick={() => onNavigate("zza://system")} />
          </div>
        </Card>
        <Card title="Tip">
          Try typing in the address bar: <span className="font-mono">search midnight os</span>
        </Card>
      </div>
    );
  }

  if (route === "search") {
    const q = params.q ?? "";
    return (
      <div className="space-y-4">
        <div className="text-lg font-semibold os-glow-text">Offline Search</div>
        <Card title="Query">
          <div className="font-mono text-sm">{q || "(empty)"}</div>
        </Card>
        <Card title="Results">
          <div className="space-y-2">
            <Result title="ZZAAKKKIIRRR OS docs" url="zza://system" onOpen={onNavigate} />
            <Result title="System news feed" url="zza://news" onOpen={onNavigate} />
            <Result title="Downloads manager" url="zza://downloads" onOpen={onNavigate} />
          </div>
        </Card>
      </div>
    );
  }

  if (route === "news") {
    return (
      <div className="space-y-4">
        <div className="text-lg font-semibold os-glow-text">News</div>
        <Card title="Bulletins">
          <ul className="list-disc pl-5 space-y-1 text-zinc-100/85">
            <li>Window Manager: stable</li>
            <li>Camera Scan: pose overlay online (optional)</li>
            <li>Midnight theme: liquid glass active</li>
          </ul>
        </Card>
      </div>
    );
  }

  if (route === "downloads") {
    return (
      <div className="space-y-4">
        <div className="text-lg font-semibold os-glow-text">Downloads</div>
        <Card title="Queue">
          <div className="text-zinc-100/80">
            Offline browser — no external downloads. This is a simulated manager.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <QuickLink label="Open System Portal" onClick={() => onNavigate("zza://system")} />
            <QuickLink label="Go Home" onClick={() => onNavigate("zza://home")} />
          </div>
        </Card>
      </div>
    );
  }

  // system portal
  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold os-glow-text">System Portal</div>
      <Card title="Access">
        <div className="text-zinc-100/80">
          You are browsing internal pages only. No real internet is available.
        </div>
      </Card>
      <Card title="Navigation">
        <div className="flex flex-wrap gap-2">
          <QuickLink label="Home" onClick={() => onNavigate("zza://home")} />
          <QuickLink label="News" onClick={() => onNavigate("zza://news")} />
          <QuickLink label="Search" onClick={() => onNavigate("zza://search?q=system")} />
        </div>
      </Card>
    </div>
  );
}

function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-200/90 hover:bg-black/30"
    >
      {label}
    </button>
  );
}

function Result({
  title,
  url,
  onOpen,
}: {
  title: string;
  url: string;
  onOpen: (raw: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(url)}
      className="w-full text-left rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 px-3 py-2"
    >
      <div className="text-sm text-zinc-100/90">{title}</div>
      <div className="font-mono text-[11px] text-emerald-300/70">{url}</div>
    </button>
  );
}

