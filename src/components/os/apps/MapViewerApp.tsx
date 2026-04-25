"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function MapViewerApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ on: boolean; sx: number; sy: number; ox: number; oy: number }>({
    on: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
  });

  const nodes = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        x: (Math.cos(i * 0.9) * 0.38 + 0.5) * 2000,
        y: (Math.sin(i * 0.85) * 0.32 + 0.5) * 2000,
      })),
    [],
  );

  useEffect(() => {
    const draw = (t: number) => {
      const can = canvasRef.current;
      if (!can) return;
      const ctx = can.getContext("2d");
      if (!ctx) return;

      const w = can.clientWidth || 900;
      const h = can.clientHeight || 520;
      if (can.width !== w || can.height !== h) {
        can.width = w;
        can.height = h;
      }

      // Background
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.20)";
      ctx.fillRect(0, 0, w, h);

      // World transform
      const z = zoom;
      const worldW = 2000;
      const worldH = 2000;
      const cx = w / 2 + pan.x;
      const cy = h / 2 + pan.y;

      const toScreen = (wx: number, wy: number) => ({
        x: cx + (wx - worldW / 2) * z,
        y: cy + (wy - worldH / 2) * z,
      });

      // Cyber grid
      const grid = 80;
      ctx.save();
      ctx.strokeStyle = "rgba(56,189,248,0.10)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= worldW; gx += grid) {
        const a = toScreen(gx, 0);
        const b = toScreen(gx, worldH);
        ctx.beginPath();
        ctx.moveTo(a.x + 0.5, a.y);
        ctx.lineTo(b.x + 0.5, b.y);
        ctx.stroke();
      }
      for (let gy = 0; gy <= worldH; gy += grid) {
        const a = toScreen(0, gy);
        const b = toScreen(worldW, gy);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y + 0.5);
        ctx.lineTo(b.x, b.y + 0.5);
        ctx.stroke();
      }
      ctx.restore();

      // Links
      ctx.save();
      ctx.strokeStyle = "rgba(168,85,247,0.24)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(168,85,247,0.25)";
      ctx.shadowBlur = 16;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        const b = nodes[(i + 1) % nodes.length]!;
        const A = toScreen(a.x, a.y);
        const B = toScreen(b.x, b.y);
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }
      ctx.restore();

      // Nodes
      const pulse = 0.5 + Math.sin(t / 600) * 0.5;
      for (const n of nodes) {
        const p = toScreen(n.x, n.y);
        const r = 6 + pulse * 2;
        ctx.beginPath();
        ctx.fillStyle = "rgba(56,189,248,0.85)";
        ctx.shadowColor = "rgba(56,189,248,0.35)";
        ctx.shadowBlur = 18;
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.strokeStyle = "rgba(34,197,94,0.20)";
        ctx.arc(p.x, p.y, r + 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      // HUD
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(12, 12, 210, 60);
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.strokeRect(12.5, 12.5, 210, 60);
      ctx.fillStyle = "rgba(56,189,248,0.85)";
      ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.fillText("MAP VIEWER", 24, 34);
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.fillText(`zoom ${Math.round(zoom * 100)}%`, 24, 54);
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [nodes, pan.x, pan.y, zoom]);

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Map Viewer</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z * 1.1, 0.6, 2.4))}
            className="rounded-xl border border-white/10 bg-black/25 hover:bg-black/35 px-3 py-2 text-xs os-accent-shadow"
          >
            Zoom +
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z / 1.1, 0.6, 2.4))}
            className="rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 px-3 py-2 text-xs"
          >
            Zoom −
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 px-3 py-2 text-xs"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-3 h-[calc(100%-44px)] rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden">
        <div
          className="relative h-full w-full"
          onPointerDown={(e) => {
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            setDrag({ on: true, sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y });
          }}
          onPointerMove={(e) => {
            if (!drag.on) return;
            const dx = e.clientX - drag.sx;
            const dy = e.clientY - drag.sy;
            setPan({ x: drag.ox + dx, y: drag.oy + dy });
          }}
          onPointerUp={() => setDrag((d) => ({ ...d, on: false }))}
          onPointerCancel={() => setDrag((d) => ({ ...d, on: false }))}
          onWheel={(e) => {
            e.preventDefault();
            const dz = e.deltaY < 0 ? 1.06 : 1 / 1.06;
            setZoom((z) => clamp(z * dz, 0.6, 2.4));
          }}
          style={{ touchAction: "none" }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />

          <div className="absolute right-4 bottom-4 rounded-2xl border border-white/10 bg-black/30 backdrop-blur px-3 py-2 text-[11px] font-mono text-zinc-300/70">
            drag to pan · wheel to zoom
          </div>
        </div>
      </div>
    </div>
  );
}

