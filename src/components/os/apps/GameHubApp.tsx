"use client";

import { useMemo, useState } from "react";

type Game = {
  id: string;
  title: string;
  genre: string;
  status: "installed" | "cloud" | "external";
  description: string;
  accent: "sky" | "emerald" | "purple" | "rose";
  href?: string; // external
};

function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}

export function GameHubApp() {
  const games = useMemo<Game[]>(
    () => [
      {
        id: "neon-runner",
        title: "Neon Runner",
        genre: "Arcade / Endless",
        status: "installed",
        description: "Dash through the midnight grid. (demo launch sequence)",
        accent: "emerald",
      },
      {
        id: "void-chess",
        title: "Void Chess",
        genre: "Strategy",
        status: "cloud",
        description: "Turn-based tactics in a glass arena. (demo launch sequence)",
        accent: "purple",
      },
      {
        id: "driftline",
        title: "Driftline 2099",
        genre: "Racing",
        status: "cloud",
        description: "Synthetic drift, neon apex, zero friction. (demo launch sequence)",
        accent: "sky",
      },
      {
        id: "signal-strike",
        title: "Signal Strike",
        genre: "Shooter",
        status: "installed",
        description: "Arcade FPS simulator. (demo launch sequence)",
        accent: "rose",
      },

      // Real “redirect” entries
      {
        id: "roblox",
        title: "Roblox",
        genre: "Platform",
        status: "external",
        description: "Open official site in a new tab.",
        accent: "sky",
        href: "https://www.roblox.com/",
      },
      {
        id: "fortnite",
        title: "Fortnite",
        genre: "Battle Royale",
        status: "external",
        description: "Open official Epic Games page in a new tab.",
        accent: "purple",
        href: "https://www.fortnite.com/",
      },
      {
        id: "valorant",
        title: "VALORANT",
        genre: "Tactical Shooter",
        status: "external",
        description: "Open official Riot page in a new tab.",
        accent: "rose",
        href: "https://www.playvalorant.com/",
      },
      {
        id: "minecraft",
        title: "Minecraft",
        genre: "Sandbox",
        status: "external",
        description: "Open official Minecraft site in a new tab.",
        accent: "emerald",
        href: "https://minecraft.com/",
      },
      {
        id: "cs2",
        title: "Counter-Strike 2",
        genre: "FPS",
        status: "external",
        description: "Open Steam store page in a new tab.",
        accent: "sky",
        href: "https://store.steampowered.com/app/730/CounterStrike_2/",
      },
      {
        id: "gta5",
        title: "Grand Theft Auto V",
        genre: "Action",
        status: "external",
        description: "Open Rockstar page in a new tab.",
        accent: "purple",
        href: "https://www.rockstargames.com/gta-v",
      },
      {
        id: "apex",
        title: "Apex Legends",
        genre: "Battle Royale",
        status: "external",
        description: "Open official site in a new tab.",
        accent: "rose",
        href: "https://apexlegends.com/",
      },
      {
        id: "league",
        title: "League of Legends",
        genre: "MOBA",
        status: "external",
        description: "Open official Riot page in a new tab.",
        accent: "sky",
        href: "https://www.leagueoflegends.com/en-us/",
      },
      {
        id: "overwatch2",
        title: "Overwatch 2",
        genre: "Shooter",
        status: "external",
        description: "Open official page in a new tab.",
        accent: "emerald",
        href: "https://overwatch2.com/",
      },
      {
        id: "dota2",
        title: "Dota 2",
        genre: "MOBA",
        status: "external",
        description: "Open Steam store page in a new tab.",
        accent: "rose",
        href: "https://www.dota2.com/home",
      },
      {
        id: "rocketleague",
        title: "Rocket League",
        genre: "Sports",
        status: "external",
        description: "Open official site in a new tab.",
        accent: "sky",
        href: "https://www.rocketleague.com/",
      },
      {
        id: "genshin",
        title: "Genshin Impact",
        genre: "RPG",
        status: "external",
        description: "Open official site in a new tab.",
        accent: "purple",
        href: "https://genshin.hoyoverse.com/",
      },
      {
        id: "warzone",
        title: "Call of Duty: Warzone",
        genre: "FPS",
        status: "external",
        description: "Open official page in a new tab.",
        accent: "emerald",
        href: "https://www.callofduty.com/warzone",
      },
      {
        id: "pubg",
        title: "PUBG: BATTLEGROUNDS",
        genre: "Battle Royale",
        status: "external",
        description: "Open official site in a new tab.",
        accent: "sky",
        href: "https://www.pubg.com/en/main",
      },
      {
        id: "steam",
        title: "Steam",
        genre: "Store",
        status: "external",
        description: "Open Steam in a new tab.",
        accent: "sky",
        href: "https://store.steampowered.com/",
      },
    ],
    [],
  );

  const [launching, setLaunching] = useState<null | { title: string; mode: "demo" | "external"; href?: string }>(
    null,
  );
  const [launchStep, setLaunchStep] = useState(0);

  const launch = async (g: Game) => {
    if (launching) return;
    const isExternal = g.status === "external" && !!g.href;
    // IMPORTANT: to avoid popup blockers, open the tab synchronously inside the click handler,
    // then navigate it later after the animation.
    const externalTab = isExternal ? window.open("about:blank", "_blank") : null;
    // Best-effort: detach opener even without noopener.
    try {
      if (externalTab) externalTab.opener = null;
    } catch {
      // ignore
    }
    setLaunching({ title: g.title, mode: isExternal ? "external" : "demo", href: g.href });
    setLaunchStep(0);

    // Arcade-style boot sequence
    await wait(120);
    setLaunchStep(1);
    await wait(420);
    setLaunchStep(2);
    await wait(520);
    setLaunchStep(3);

    if (isExternal) {
      // Navigate the already-opened tab; if it was blocked, we show a manual link.
      try {
        if (externalTab) externalTab.location.replace(g.href!);
      } catch {
        // ignore
      }
      await wait(350);
      setLaunching(null);
      return;
    }

    await wait(900);
    setLaunching(null);
  };

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Game Hub</div>
        <div className="font-mono text-[11px] text-zinc-300/60">arcade</div>
      </div>

      <div className="mt-3 h-[calc(100%-44px)] rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
          <div className="text-xs tracking-widest text-zinc-200/80">LIBRARY</div>
          <div className="text-[11px] font-mono text-[rgb(var(--os-accent))]">
            {games.length} titles
          </div>
        </div>

        <div className="p-4 overflow-auto h-[calc(100%-49px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {games.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => void launch(g)}
                className={[
                  "group text-left rounded-2xl border border-white/10 bg-black/20 hover:bg-black/30 overflow-hidden",
                  "transition-transform duration-150 active:scale-[0.99]",
                ].join(" ")}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-100 truncate">{g.title}</div>
                      <div className="mt-1 text-[11px] font-mono text-zinc-300/60 truncate">{g.genre}</div>
                    </div>
                    <div
                      className={[
                        "shrink-0 rounded-xl border px-2 py-1 text-[10px] font-mono",
                        "border-white/10 bg-black/20 text-zinc-200/80",
                      ].join(" ")}
                    >
                      {g.status === "external" ? "LINK" : g.status.toUpperCase()}
                    </div>
                  </div>

                  <div className="mt-3 text-[12px] text-zinc-200/80 line-clamp-2">
                    {g.description}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div
                      className={[
                        "h-2 w-2 rounded-full",
                        g.accent === "emerald"
                          ? "bg-emerald-400"
                          : g.accent === "purple"
                            ? "bg-purple-400"
                            : g.accent === "rose"
                              ? "bg-rose-400"
                              : "bg-sky-400",
                        "shadow-[0_0_18px_rgba(var(--os-accent),0.18)]",
                      ].join(" ")}
                    />
                    <div className="text-[11px] font-mono text-zinc-300/60">
                      press to launch
                    </div>
                  </div>
                </div>

                <div className="h-1 w-full bg-gradient-to-r from-[rgba(var(--os-accent),0.0)] via-[rgba(var(--os-accent),0.35)] to-[rgba(var(--os-accent),0.0)] opacity-60 group-hover:opacity-90 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {launching && (
        <div className="fixed inset-0 z-[2500] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-black/30 os-liquid-edge overflow-hidden os-accent-shadow">
            <div className="px-5 py-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-100">{launching.title}</div>
              <div className="text-[11px] font-mono text-[rgb(var(--os-accent))]">
                {launching.mode === "external" ? "REDIRECT" : "LAUNCH"}
              </div>
            </div>
            <div className="p-5">
              <div className="font-mono text-[12px] text-zinc-200/80 whitespace-pre-wrap">
                {launchStep >= 0 ? "initializing core…" : ""}
                {"\n"}
                {launchStep >= 1 ? "loading assets…" : ""}
                {"\n"}
                {launchStep >= 2 ? "syncing runtime…" : ""}
                {"\n"}
                {launchStep >= 3
                  ? launching.mode === "external"
                    ? "opening portal in new tab…"
                    : "launch complete (demo)"
                  : ""}
              </div>

              <div className="mt-4 h-2 rounded-full border border-white/10 bg-black/25 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[rgba(var(--os-accent),0.15)] via-[rgba(var(--os-accent),0.75)] to-[rgba(var(--os-accent),0.15)] transition-[width] duration-300"
                  style={{ width: `${(launchStep / 3) * 100}%` }}
                />
              </div>

              <div className="mt-4 text-[11px] text-zinc-300/60">
                {launching.mode === "external" ? (
                  <>
                    External games open a new tab (official sites). If your browser blocks popups, use{" "}
                    <a
                      href={launching.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[rgb(var(--os-accent))] underline underline-offset-2"
                    >
                      this link
                    </a>
                    .
                  </>
                ) : (
                  "This is a fake launcher animation for now."
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

