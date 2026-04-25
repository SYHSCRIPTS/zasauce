"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Brush, Eraser, ImageUp, Trash2 } from "lucide-react";

type Tool = "brush" | "eraser";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function ImageEditorApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [tool, setTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(10);
  const [color, setColor] = useState("#ff2d85");
  const [hasImage, setHasImage] = useState(false);
  const [drawing, setDrawing] = useState<{ on: boolean; lastX: number; lastY: number }>({ on: false, lastX: 0, lastY: 0 });

  const accentStyle = useMemo(() => ({ accentColor: `rgb(var(--os-accent))` }), []);

  useEffect(() => {
    const can = canvasRef.current;
    if (!can) return;
    const ctx = can.getContext("2d");
    if (!ctx) return;

    const tick = () => {
      const w = can.clientWidth || 900;
      const h = can.clientHeight || 600;
      if (can.width !== w || can.height !== h) {
        const prev = document.createElement("canvas");
        prev.width = can.width;
        prev.height = can.height;
        const prevCtx = prev.getContext("2d");
        if (prevCtx) prevCtx.drawImage(can, 0, 0);
        can.width = w;
        can.height = h;
        ctx.clearRect(0, 0, w, h);

        // redraw base image
        const img = imgRef.current;
        if (img) {
          const fit = fitContain(img.naturalWidth, img.naturalHeight, w, h);
          ctx.drawImage(img, fit.x, fit.y, fit.w, fit.h);
        }
        // redraw previous strokes scaled to new size (best-effort)
        if (prev.width > 0 && prev.height > 0) ctx.drawImage(prev, 0, 0, w, h);
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const clear = () => {
    const can = canvasRef.current;
    if (!can) return;
    const ctx = can.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, can.width, can.height);
    const img = imgRef.current;
    if (img) {
      const fit = fitContain(img.naturalWidth, img.naturalHeight, can.width, can.height);
      ctx.drawImage(img, fit.x, fit.y, fit.w, fit.h);
    }
  };

  const loadFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      imgRef.current = img;
      setHasImage(true);
      const can = canvasRef.current;
      if (!can) return;
      const ctx = can.getContext("2d");
      if (!ctx) return;
      const fit = fitContain(img.naturalWidth, img.naturalHeight, can.width || can.clientWidth, can.height || can.clientHeight);
      // ensure canvas is sized
      const w = can.clientWidth || 900;
      const h = can.clientHeight || 600;
      if (can.width !== w || can.height !== h) {
        can.width = w;
        can.height = h;
      }
      ctx.clearRect(0, 0, can.width, can.height);
      ctx.drawImage(img, fit.x, fit.y, fit.w, fit.h);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const pointerToCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const can = e.currentTarget;
    const r = can.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * can.width;
    const y = ((e.clientY - r.top) / r.height) * can.height;
    return { x, y };
  };

  const stroke = (x0: number, y0: number, x1: number, y1: number) => {
    const can = canvasRef.current;
    if (!can) return;
    const ctx = can.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  };

  return (
    <div className="h-full w-full p-4 text-sm text-slate-900/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-slate-900">Image Editor</div>
        <div className="text-[11px] font-mono text-slate-600/70">{tool.toUpperCase()}</div>
      </div>

      <div className="mt-3 grid grid-cols-12 gap-3 h-[calc(100%-44px)] min-h-0">
        <div className="col-span-4 rounded-2xl border border-white/50 bg-white/15 os-liquid-edge overflow-hidden min-h-0 flex flex-col">
          <div className="px-4 py-3 border-b border-white/40 bg-white/10 flex items-center justify-between">
            <div className="text-xs tracking-widest text-slate-700/80">TOOLS</div>
            <div className="h-2 w-2 rounded-full bg-[rgb(var(--os-accent))] shadow-[0_0_18px_rgba(var(--os-accent),0.18)]" />
          </div>

          <div className="p-4 space-y-3 overflow-auto">
            <label className="block">
              <div className="text-[11px] font-mono text-slate-600/70">UPLOAD</div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-[12px] text-slate-700 file:mr-3 file:rounded-xl file:border file:border-white/50 file:bg-white/30 file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-slate-800 hover:file:bg-white/40"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void loadFile(f);
                    e.currentTarget.value = "";
                  }}
                />
              </div>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTool("brush")}
                className={[
                  "h-10 rounded-2xl border px-3 flex items-center justify-center gap-2",
                  tool === "brush" ? "border-white/70 bg-white/35" : "border-white/45 bg-white/20 hover:bg-white/25",
                ].join(" ")}
              >
                <Brush className="h-4 w-4 text-rose-600" />
                <span className="text-[12px] font-semibold">Draw</span>
              </button>
              <button
                type="button"
                onClick={() => setTool("eraser")}
                className={[
                  "h-10 rounded-2xl border px-3 flex items-center justify-center gap-2",
                  tool === "eraser" ? "border-white/70 bg-white/35" : "border-white/45 bg-white/20 hover:bg-white/25",
                ].join(" ")}
              >
                <Eraser className="h-4 w-4 text-slate-700" />
                <span className="text-[12px] font-semibold">Erase</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-mono text-slate-600/70">BRUSH SIZE</div>
                <div className="text-[11px] font-mono text-slate-600/70">{brushSize}px</div>
              </div>
              <input
                type="range"
                min={2}
                max={44}
                value={brushSize}
                onChange={(e) => setBrushSize(clamp(Number(e.target.value), 2, 44))}
                className="mt-2 w-full"
                style={accentStyle}
              />
            </div>

            <div className={tool === "brush" ? "" : "opacity-50 pointer-events-none"}>
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-mono text-slate-600/70">COLOR</div>
                <div className="h-5 w-5 rounded-lg border border-white/60 bg-white/30 flex items-center justify-center">
                  <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                </div>
              </div>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="mt-2 h-10 w-full rounded-2xl border border-white/50 bg-white/20 px-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={clear}
                className="h-10 rounded-2xl border border-white/45 bg-white/20 hover:bg-white/25 px-3 flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4 text-slate-700" />
                <span className="text-[12px] font-semibold">Clear</span>
              </button>
              <div className="h-10 rounded-2xl border border-white/45 bg-white/15 px-3 flex items-center justify-center gap-2 text-[12px] text-slate-700/70">
                <ImageUp className="h-4 w-4" />
                {hasImage ? "image loaded" : "no image"}
              </div>
            </div>

            <div className="text-[11px] text-slate-600/70">
              Tip: upload an image, then draw/erase directly on it.
            </div>
          </div>
        </div>

        <div className="col-span-8 rounded-2xl border border-white/50 bg-white/15 os-liquid-edge overflow-hidden min-h-0 flex flex-col">
          <div className="px-4 py-3 border-b border-white/40 bg-white/10 flex items-center justify-between">
            <div className="text-xs tracking-widest text-slate-700/80">CANVAS</div>
            <div className="text-[11px] font-mono text-slate-600/70">
              {tool === "eraser" ? "eraser" : "brush"} · {brushSize}px
            </div>
          </div>

          <div className="p-3 flex-1 min-h-0">
            <div className="relative h-full w-full rounded-2xl border border-white/40 bg-white/20 overflow-hidden">
              <canvas
                ref={canvasRef}
                className="h-full w-full touch-none"
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
                  const p = pointerToCanvas(e);
                  setDrawing({ on: true, lastX: p.x, lastY: p.y });
                }}
                onPointerMove={(e) => {
                  if (!drawing.on) return;
                  const p = pointerToCanvas(e);
                  stroke(drawing.lastX, drawing.lastY, p.x, p.y);
                  setDrawing((s) => ({ ...s, lastX: p.x, lastY: p.y }));
                }}
                onPointerUp={() => setDrawing((s) => ({ ...s, on: false }))}
                onPointerCancel={() => setDrawing((s) => ({ ...s, on: false }))}
              />
              {!hasImage && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-700/70 text-sm">
                  Upload an image to start editing.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fitContain(srcW: number, srcH: number, dstW: number, dstH: number) {
  const s = Math.min(dstW / srcW, dstH / srcH);
  const w = Math.max(1, Math.floor(srcW * s));
  const h = Math.max(1, Math.floor(srcH * s));
  const x = Math.floor((dstW - w) / 2);
  const y = Math.floor((dstH - h) / 2);
  return { x, y, w, h };
}

