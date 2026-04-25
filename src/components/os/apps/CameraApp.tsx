"use client";

import { useEffect, useRef, useState } from "react";
import { addPhoto } from "@/lib/os/galleryDb";
import { useWindowStore } from "@/lib/os/windowStore";

export function CameraApp() {
  const openApp = useWindowStore((s) => s.openApp);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>("Tap Capture to save a photo to Gallery.");

  useEffect(() => {
    let stream: MediaStream | null = null;

    const stop = () => {
      if (stream) for (const t of stream.getTracks()) t.stop();
      stream = null;
    };

    const run = async () => {
      try {
        setStatus("requesting");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const v = videoRef.current;
        if (!v) throw new Error("Video element missing.");
        v.srcObject = stream;
        await v.play();
        setStatus("ready");
      } catch (e) {
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : "Camera error");
      }
    };

    void run();
    return () => stop();
  }, []);

  const capture = async () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      c.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) return;
    await addPhoto(blob, `Photo ${new Date().toLocaleString()}`);
    setNotice("Saved to Gallery.");
  };

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Camera</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openApp("gallery")}
            className="rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 px-3 py-2 text-xs"
          >
            Open Gallery
          </button>
          <button
            type="button"
            onClick={() => void capture()}
            disabled={status !== "ready"}
            className="rounded-xl border border-white/10 bg-black/25 hover:bg-black/35 px-3 py-2 text-xs os-accent-shadow disabled:opacity-40"
          >
            Capture
          </button>
        </div>
      </div>

      <div className="mt-3 h-[calc(100%-44px)] rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden">
        <div className="relative h-full w-full bg-slate-950/70">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover opacity-95"
            playsInline
            muted
          />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />

          <div className="absolute left-4 top-4 right-4 flex items-start justify-between">
            <div className="rounded-2xl bg-black/35 backdrop-blur px-4 py-3 border border-white/10">
              <div className="font-mono text-[12px] tracking-widest text-zinc-200/80">CAMERA</div>
              <div className="mt-1 font-mono text-[11px] text-zinc-300/60">
                {status === "requesting" && "REQUESTING…"}
                {status === "ready" && "READY"}
                {status === "error" && "ERROR"}
                {status === "idle" && "IDLE"}
              </div>
            </div>
          </div>

          <div className="absolute left-4 right-4 bottom-4">
            {status === "error" ? (
              <div className="rounded-2xl border border-rose-400/25 bg-black/35 backdrop-blur px-4 py-3 text-sm text-rose-100">
                {errorMsg ?? "Could not access camera. Check browser permissions."}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/35 backdrop-blur px-4 py-3 text-[11px] font-mono text-zinc-300/70">
                {notice}
              </div>
            )}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

