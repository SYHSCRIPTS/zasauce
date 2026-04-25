"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { APPS } from "@/lib/os/apps";
import type { AppId } from "@/lib/os/types";
import { useWindowStore } from "@/lib/os/windowStore";

type TermLine = { id: string; text: string; tone?: "dim" | "ok" | "warn" | "err" };

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function formatAppList(): string[] {
  return APPS.map((a) => `${a.id.padEnd(14)}  ${a.title}`);
}

export function TerminalApp() {
  const openApp = useWindowStore((s) => s.openApp);
  const windowsCount = useWindowStore((s) => s.windows.length);

  const [lines, setLines] = useState<TermLine[]>([]);
  const [buffer, setBuffer] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const prompt = useMemo(() => "user@zzaakkkiirrr:~$ ", []);

  const appendLine = (text: string, tone?: TermLine["tone"]) => {
    setLines((s) => [...s, { id: uid(), text, tone }]);
  };

  const clear = () => setLines([]);

  // Simple typing animation queue (line-by-line).
  const typeLine = async (text: string, tone?: TermLine["tone"], cps = 120) => {
    setIsBusy(true);
    const id = uid();
    setLines((s) => [...s, { id, text: "", tone }]);
    const delay = Math.max(4, Math.floor(1000 / cps));

    for (let i = 0; i < text.length; i += 1) {
      await new Promise((r) => window.setTimeout(r, delay));
      const chunk = text.slice(0, i + 1);
      setLines((s) => s.map((l) => (l.id === id ? { ...l, text: chunk } : l)));
    }
    setIsBusy(false);
  };

  useEffect(() => {
    // Boot banner (typed)
    let cancelled = false;
    (async () => {
      await typeLine("ZZAAKKKIIRRR OS Terminal", "ok", 140);
      if (cancelled) return;
      await typeLine('Type "help" to see commands.', "dim", 140);
      if (cancelled) return;
      appendLine("");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines, isBusy]);

  useEffect(() => {
    // Focus for keyboard-driven usage
    inputRef.current?.focus();
  }, []);

  const run = async (raw: string) => {
    const cmdline = raw.trim();
    if (!cmdline) return;

    appendLine(prompt + cmdline, "dim");
    setHistory((h) => [cmdline, ...h].slice(0, 50));
    setHistIdx(null);

    const [head, ...rest] = cmdline.split(/\s+/g);
    const cmd = normalize(head ?? "");
    const arg = rest.join(" ").trim();

    if (cmd === "help") {
      appendLine("Commands:", "ok");
      appendLine("  help                 show this help");
      appendLine("  clear                clear terminal");
      appendLine("  whoami               opens Camera Scan app");
      appendLine("  apps                 list installed apps");
      appendLine("  open [app]           open app by id or name");
      appendLine("  system               show basic system info");
      return;
    }

    if (cmd === "clear") {
      clear();
      return;
    }

    if (cmd === "whoami") {
      appendLine("Identity scan required. Launching Camera Scan…", "warn");
      openApp("camera-scan");
      return;
    }

    if (cmd === "apps") {
      appendLine("Installed apps:", "ok");
      for (const l of formatAppList()) appendLine("  " + l);
      appendLine("");
      appendLine('Tip: open by id (example: "open notes")', "dim");
      return;
    }

    if (cmd === "open") {
      if (!arg) {
        appendLine('Usage: open [app]. Try "apps" to list.', "warn");
        return;
      }
      const key = normalize(arg);
      const found = APPS.find((a) => normalize(a.id) === key || normalize(a.title) === key);
      if (!found) {
        appendLine(`App not found: ${arg}`, "err");
        appendLine('Run "apps" to list available apps.', "dim");
        return;
      }
      openApp(found.id as AppId);
      appendLine(`Opened: ${found.title}`, "ok");
      return;
    }

    if (cmd === "system") {
      appendLine("System:", "ok");
      appendLine(`  windows: ${windowsCount}`);
      appendLine(`  time:    ${new Date().toLocaleString()}`);
      appendLine(`  agent:   ${navigator.userAgent}`);
      const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      if (typeof dm === "number") {
        appendLine(`  memory:  ${dm} GB`);
      }
      return;
    }

    appendLine(`Unknown command: ${cmd}`, "err");
    appendLine('Type "help" for commands.', "dim");
  };

  return (
    <div
      className="h-full w-full p-4"
      onMouseDown={() => inputRef.current?.focus()}
      onTouchStart={() => inputRef.current?.focus()}
    >
      {/* liquid glass container + hacker terminal inside */}
      <div className="h-full w-full rounded-2xl os-glass os-liquid-edge border border-slate-900/10 overflow-hidden">
        <div className="h-full w-full p-4 bg-slate-950/85">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[12px] tracking-widest text-emerald-300/90">
              TERMINAL
            </div>
            <div className="font-mono text-[11px] text-emerald-200/60">
              {isBusy ? "typing…" : "ready"}
            </div>
          </div>

          <div
            ref={scrollRef}
            className="mt-3 h-[calc(100%-44px)] overflow-auto pr-2 font-mono text-[13px] leading-5 text-emerald-200/90"
          >
            {lines.map((l) => (
              <div
                key={l.id}
                className={[
                  "whitespace-pre-wrap break-words",
                  l.tone === "dim" ? "text-emerald-200/60" : "",
                  l.tone === "ok" ? "text-emerald-200/90" : "",
                  l.tone === "warn" ? "text-lime-200/90" : "",
                  l.tone === "err" ? "text-rose-200/90" : "",
                ].join(" ")}
              >
                {l.text}
              </div>
            ))}

            <div className="whitespace-pre-wrap break-words text-emerald-200/90">
              <span className="text-emerald-200/70">{prompt}</span>
              <span>{buffer}</span>
              <span className="os-terminal-cursor ml-1 align-baseline" />
            </div>
          </div>

          {/* hidden input to keep it keyboard-driven */}
          <input
            ref={inputRef}
            className="absolute -left-[9999px] -top-[9999px] opacity-0"
            value={buffer}
            onChange={(e) => setBuffer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = buffer;
                setBuffer("");
                void run(v);
                e.preventDefault();
                return;
              }
              if (e.key === "Tab") {
                // simple autocomplete for "open "
                const cur = buffer;
                if (normalize(cur).startsWith("open ")) {
                  const partial = normalize(cur.slice(5));
                  const match = APPS.find(
                    (a) =>
                      normalize(a.id).startsWith(partial) ||
                      normalize(a.title).startsWith(partial),
                  );
                  if (match) setBuffer(`open ${match.id}`);
                }
                e.preventDefault();
                return;
              }
              if (e.key === "ArrowUp") {
                if (history.length === 0) return;
                const next = histIdx === null ? 0 : Math.min(history.length - 1, histIdx + 1);
                setHistIdx(next);
                setBuffer(history[next] ?? "");
                e.preventDefault();
                return;
              }
              if (e.key === "ArrowDown") {
                if (history.length === 0) return;
                if (histIdx === null) return;
                const next = histIdx - 1;
                if (next < 0) {
                  setHistIdx(null);
                  setBuffer("");
                } else {
                  setHistIdx(next);
                  setBuffer(history[next] ?? "");
                }
                e.preventDefault();
              }
            }}
            aria-label="Terminal input"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

