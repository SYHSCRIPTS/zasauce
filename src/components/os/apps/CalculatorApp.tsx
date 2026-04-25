"use client";

import { create, all } from "mathjs";
import { useMemo, useState } from "react";

const math = create(all, {});

type Key =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "."
  | "+"
  | "-"
  | "*"
  | "/"
  | "("
  | ")"
  | "pi"
  | "e"
  | "sqrt("
  | "sin("
  | "cos("
  | "tan("
  | "log10("
  | "ln("
  | "^"
  | "DEL"
  | "AC"
  | "=";

export function CalculatorApp() {
  const [expr, setExpr] = useState("0");
  const [result, setResult] = useState<string>("0");
  const [err, setErr] = useState<string | null>(null);
  const [flashErr, setFlashErr] = useState<string | null>(null);

  const keys: { k: Key; label: string; tone?: "op" | "fn" | "danger" }[] = useMemo(
    () => [
      { k: "AC", label: "AC", tone: "danger" },
      { k: "DEL", label: "DEL", tone: "danger" },
      { k: "(", label: "(" },
      { k: ")", label: ")" },

      { k: "sin(", label: "sin", tone: "fn" },
      { k: "cos(", label: "cos", tone: "fn" },
      { k: "tan(", label: "tan", tone: "fn" },
      { k: "/", label: "÷", tone: "op" },

      { k: "log10(", label: "log", tone: "fn" },
      { k: "ln(", label: "ln", tone: "fn" },
      { k: "sqrt(", label: "√", tone: "fn" },
      { k: "*", label: "×", tone: "op" },

      { k: "7", label: "7" },
      { k: "8", label: "8" },
      { k: "9", label: "9" },
      { k: "-", label: "−", tone: "op" },

      { k: "4", label: "4" },
      { k: "5", label: "5" },
      { k: "6", label: "6" },
      { k: "+", label: "+", tone: "op" },

      { k: "1", label: "1" },
      { k: "2", label: "2" },
      { k: "3", label: "3" },
      { k: "^", label: "^", tone: "op" },

      { k: "0", label: "0" },
      { k: ".", label: "." },
      { k: "pi", label: "π", tone: "fn" },
      { k: "e", label: "e", tone: "fn" },

      { k: "=", label: "=", tone: "op" },
    ],
    [],
  );

  const flashNonNumberError = () => {
    setFlashErr("error");
    window.setTimeout(() => setFlashErr(null), 450);
  };

  const safeEval = (raw: string) => {
    // Convert user-friendly tokens
    const normalized = raw
      .replaceAll("÷", "/")
      .replaceAll("×", "*")
      .replaceAll("−", "-")
      .replaceAll("π", "pi");
    try {
      const v = math.evaluate(normalized, {
        pi: Math.PI,
        e: Math.E,
        ln: (x: number) => Math.log(x),
        log10: (x: number) => Math.log10(x),
      });
      if (typeof v === "number") return String(Number.isFinite(v) ? v : "Error");
      return String(v);
    } catch {
      return "Error";
    }
  };

  const press = (k: Key) => {
    // Brief "error" flash for anything that isn't a number key.
    if (!/^\d$/.test(k)) flashNonNumberError();

    if (k === "AC") {
      setErr(null);
      setExpr("0");
      setResult("0");
      return;
    }
    if (k === "DEL") {
      setErr(null);
      setExpr((e) => {
        const next = e.length <= 1 ? "0" : e.slice(0, -1);
        setResult(safeEval(next));
        return next;
      });
      return;
    }
    if (k === "=") {
      const r = safeEval(expr);
      if (r === "Error") setErr("Invalid expression");
      else {
        setErr(null);
        setExpr(r);
        setResult(r);
      }
      return;
    }

    const token =
      k === "pi" ? "pi" : k === "e" ? "e" : k;
    setExpr((e) => {
      const base = e === "0" ? "" : e;
      const next = base + token;
      // Keep the live result correct even if we show a brief error flash.
      setResult(safeEval(next));
      return next;
    });
  };

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Calculator</div>
        <div className="font-mono text-[11px] text-zinc-300/60">scientific</div>
      </div>

      <div className="mt-3 h-[calc(100%-44px)] rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 bg-black/20">
          <div className="font-mono text-[12px] text-zinc-300/70 break-words min-h-[20px]">
            {expr}
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-[11px] text-rose-200/70 font-mono">
              {flashErr ?? err ?? ""}
            </div>
            <div className="font-mono text-2xl text-zinc-100 os-glow-text tabular-nums">
              {result}
            </div>
          </div>
        </div>

        <div className="flex-1 p-4">
          <div className="grid grid-cols-4 gap-2">
            {keys.map(({ k, label, tone }) => (
              <CalcBtn key={k} label={label} tone={tone} onClick={() => press(k)} span={k === "=" ? 4 : 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalcBtn({
  label,
  tone,
  onClick,
  span,
}: {
  label: string;
  tone?: "op" | "fn" | "danger";
  onClick: () => void;
  span?: number;
}) {
  const cls =
    tone === "danger"
      ? "border-rose-400/25 text-rose-200 bg-black/20 hover:bg-black/30"
      : tone === "op"
        ? "border-[rgba(var(--os-accent),0.25)] text-zinc-100 bg-[rgba(var(--os-accent),0.10)] hover:bg-[rgba(var(--os-accent),0.16)]"
        : tone === "fn"
          ? "border-emerald-400/20 text-emerald-200 bg-black/20 hover:bg-black/30"
          : "border-white/10 text-zinc-100 bg-black/20 hover:bg-black/30";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border px-3 py-3 font-mono text-[14px] transition-transform duration-100",
        "active:scale-[0.97] active:brightness-110",
        "shadow-[0_14px_30px_rgba(0,0,0,0.25)]",
        cls,
      ].join(" ")}
      style={span && span > 1 ? { gridColumn: `span ${span}` } : undefined}
    >
      {label}
    </button>
  );
}

