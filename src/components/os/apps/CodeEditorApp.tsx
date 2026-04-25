"use client";

import { create, all } from "mathjs";
import { useEffect, useMemo, useRef, useState } from "react";

const math = create(all, {});

type FileTab = {
  id: string;
  name: string;
  language: "js" | "ts" | "json" | "md";
  content: string;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function guessHighlight(line: string) {
  // super lightweight “fake” highlighting (no dependencies)
  const keywords =
    /\b(const|let|var|function|return|if|else|for|while|import|from|export|class|new|try|catch|throw|await|async)\b/g;
  const numbers = /\b(\d+(\.\d+)?)\b/g;
  const strings = /(["'`])(?:\\.|(?!\1).)*\1/g;
  const comments = /(\/\/.*$)/g;
  const html = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const base = html(line);
  return base
    .replace(comments, `<span class="cmt">$1</span>`)
    .replace(strings, `<span class="str">$&</span>`)
    .replace(numbers, `<span class="num">$1</span>`)
    .replace(keywords, `<span class="kw">$1</span>`);
}

export function CodeEditorApp() {
  const [tabs, setTabs] = useState<FileTab[]>(() => [
    {
      id: uid(),
      name: "main.js",
      language: "js",
      content: `// ZZAAKKKIIRRR OS - Code Editor
const msg = "midnight online";

function boot() {
  console.log("boot:", msg);
}

boot();
`,
    },
    {
      id: uid(),
      name: "utils.js",
      language: "js",
      content: `export function sum(a, b) {
  return a + b;
}
`,
    },
    {
      id: uid(),
      name: "config.json",
      language: "json",
      content: `{
  "theme": "midnight",
  "accent": "cyber-blue"
}
`,
    },
  ]);

  const [activeId, setActiveId] = useState<string>(() => tabs[0]!.id);
  const [consoleLines, setConsoleLines] = useState<string[]>([
    "[console] ready",
  ]);
  const [inputLine, setInputLine] = useState("");
  const [runPulse, setRunPulse] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const active = useMemo(() => tabs.find((t) => t.id === activeId)!, [tabs, activeId]);

  const highlighted = useMemo(() => {
    const lines = active.content.split("\n");
    return lines.map((l) => guessHighlight(l)).join("\n");
  }, [active.content]);

  const updateActiveContent = (next: string) => {
    setTabs((s) => s.map((t) => (t.id === activeId ? { ...t, content: next } : t)));
  };

  const run = () => {
    setRunPulse((p) => p + 1);
    setConsoleLines((s) => [
      ...s,
      `[run] ${active.name}`,
      ...fakeExecute(active.content),
    ]);
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeId]);

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Code Editor</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={run}
            className="rounded-xl border border-white/10 bg-black/25 hover:bg-black/35 px-3 py-2 text-xs os-accent-shadow"
          >
            Run
          </button>
          <button
            type="button"
            onClick={() => setConsoleLines(["[console] cleared"])}
            className="rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 px-3 py-2 text-xs"
          >
            Clear Console
          </button>
        </div>
      </div>

      <div className="mt-3 h-[calc(100%-44px)] rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden flex flex-col">
        {/* tabs */}
        <div className="px-3 py-2 border-b border-white/10 bg-black/20 flex items-center gap-2 overflow-x-auto">
          {tabs.map((t) => {
            const activeTab = t.id === activeId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={[
                  "shrink-0 rounded-xl border px-3 py-2 text-xs font-mono transition-colors",
                  activeTab
                    ? "border-white/20 bg-black/35 text-zinc-100 shadow-[0_18px_40px_rgba(var(--os-accent),0.12)]"
                    : "border-white/10 bg-black/20 hover:bg-black/30 text-zinc-200/80",
                ].join(" ")}
              >
                {t.name}
              </button>
            );
          })}

          <div className="ml-auto text-[11px] font-mono text-zinc-300/60">
            {active.language.toUpperCase()}
          </div>
        </div>

        {/* editor + console */}
        <div className="flex-1 grid grid-cols-12 gap-0">
          {/* editor */}
          <div className="col-span-8 border-r border-white/10 relative">
            <div className="absolute inset-0 p-4 font-mono text-[12px] leading-5">
              {/* highlight layer */}
              <pre
                className="absolute inset-4 overflow-auto whitespace-pre-wrap break-words text-zinc-100/80"
                aria-hidden="true"
              >
                <code
                  className="code"
                  dangerouslySetInnerHTML={{ __html: highlighted || " " }}
                />
              </pre>

              {/* textarea layer */}
              <textarea
                ref={textareaRef}
                value={active.content}
                onChange={(e) => updateActiveContent(e.target.value)}
                spellCheck={false}
                className={[
                  "absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] resize-none",
                  "bg-transparent text-transparent caret-emerald-300 outline-none",
                  "font-mono text-[12px] leading-5",
                ].join(" ")}
              />
            </div>

            <div className="absolute right-4 top-3 text-[11px] font-mono text-zinc-300/60">
              {runPulse ? "●" : "○"} editor
            </div>
          </div>

          {/* fake console */}
          <div className="col-span-4 flex flex-col">
            <div className="px-3 py-2 border-b border-white/10 bg-black/20 flex items-center justify-between">
              <div className="text-xs tracking-widest text-zinc-200/80">CONSOLE</div>
              <div className="text-[11px] font-mono text-emerald-300/70">LIVE</div>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-1 font-mono text-[11px] text-zinc-200/80">
              {consoleLines.map((l, i) => (
                <div key={i} className="whitespace-pre-wrap break-words">
                  {l}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-white/10 bg-black/20">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-mono text-[rgb(var(--os-accent))]">&gt;</div>
                <input
                  value={inputLine}
                  onChange={(e) => setInputLine(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const t = inputLine.trim();
                      if (t) {
                        setConsoleLines((s) => [...s, `> ${t}`, "(simulated)"]);
                        setInputLine("");
                      }
                      e.preventDefault();
                    }
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-mono outline-none placeholder:text-zinc-400"
                  placeholder="type a command…"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .code :global(.kw) { color: rgba(56, 189, 248, 0.95); }
        .code :global(.str) { color: rgba(34, 197, 94, 0.95); }
        .code :global(.num) { color: rgba(168, 85, 247, 0.95); }
        .code :global(.cmt) { color: rgba(161, 161, 170, 0.75); }
      `}</style>
    </div>
  );
}

function fakeExecute(src: string): string[] {
  // “Fake but somewhat real” console:
  // - extracts console.log(...) and print(...)
  // - evaluates simple arithmetic inside print/log (via mathjs) when it isn't a string literal
  const out: string[] = [];
  const lines = src.split("\n");

  const evalArg = (raw: string) => {
    const s = raw.trim();
    // quoted string
    const m = s.match(/^(['"`])(.*)\1$/);
    if (m) return m[2] ?? "";
    // try math evaluation (safe-ish: no functions unless mathjs allows them; still okay for demo)
    try {
      const v = math.evaluate(s);
      if (typeof v === "number") return String(Number.isFinite(v) ? v : "Error");
      return String(v);
    } catch {
      return s;
    }
  };

  for (const line of lines) {
    const logMatch = line.match(/console\.(log|error|warn)\((.*)\)\s*;?\s*$/);
    if (logMatch) {
      const level = logMatch[1] ?? "log";
      const rawArgs = logMatch[2] ?? "";
      const parts = rawArgs.split(",").map((p) => evalArg(p));
      out.push(`[${level}] ${parts.join(" ")}`.trim());
      continue;
    }

    const printMatch = line.match(/(^|\s)print\((.*)\)\s*;?\s*$/);
    if (printMatch) {
      const rawArgs = printMatch[2] ?? "";
      const parts = rawArgs.split(",").map((p) => evalArg(p));
      out.push(parts.join(" "));
      continue;
    }
  }

  if (out.length === 0) out.push("[log] (no output)");
  out.push("[run] exit code 0");
  return out;
}

