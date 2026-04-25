"use client";

import { useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

type AnalysisResult = {
  personality: "Calm" | "Active" | "Shy" | "Emotional" | "Focused" | "Restless" | "Neutral";
  confidencePct: number;
  energyPct: number;
};

type FaceBox = { x: number; y: number; w: number; h: number } | null;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickPersonality({
  movement,
  stability,
  centering,
  jitter,
}: {
  movement: number; // 0..1
  stability: number; // 0..1
  centering: number; // 0..1
  jitter: number; // 0..1
}): AnalysisResult["personality"] {
  // Heuristic mapping based ONLY on requested signals.
  if (movement < 0.22 && stability > 0.70 && jitter < 0.30) return "Calm";
  if (movement > 0.72 && jitter > 0.58) return "Restless";
  if (movement > 0.70 && stability < 0.45) return "Active";
  if (centering < 0.45 && movement < 0.40) return "Shy";
  if (centering > 0.74 && stability > 0.62 && jitter < 0.45) return "Focused";
  if (jitter > 0.62 && stability < 0.55) return "Emotional";
  return "Neutral";
}

export function CameraScanApp() {
  // Read scan intensity once (avoid per-frame React reads).
  const scanIntensityRef = useRef<number>(0.75);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<
    "idle" | "requesting" | "running" | "error" | "done"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [mpStatus, setMpStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");

  const [metrics, setMetrics] = useState({
    movement: 0,
    stability: 0,
    centering: 0,
    jitter: 0,
  });

  // 4 phases (about 1s each) + result.
  const phaseMs = 1000;
  const analyzeDurationMs = 4 * phaseMs;

  // Status text updated infrequently; drawing is canvas-only.
  const [phaseText, setPhaseText] = useState("INITIALIZING…");
  const [lockText, setLockText] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let startedAt = 0;
    let lastPhase = -1;
    let lastUiUpdate = 0;
    let lastSeenFaceTs = 0;

    const ensureOffscreen = () => {
      if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
      return offscreenRef.current;
    };

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (stream) {
        for (const t of stream.getTracks()) t.stop();
      }
      stream = null;
    };

    const run = async () => {
      try {
        setStatus("requesting");
        setErrorMsg(null);
        setPhaseText("INITIALIZING…");
        setLockText(null);

        try {
          const v = Number(
            getComputedStyle(document.documentElement).getPropertyValue("--scan-intensity") || "0.75",
          );
          scanIntensityRef.current = Number.isFinite(v) ? v : 0.75;
        } catch {
          scanIntensityRef.current = 0.75;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        const v = videoRef.current;
        if (!v) throw new Error("Video element missing.");
        v.srcObject = stream;
        await v.play();

        startedAt = performance.now();
        setStatus("running");

        const can = canvasRef.current;
        if (!can) throw new Error("Canvas missing.");
        const ctx = can.getContext("2d");
        if (!ctx) throw new Error("Canvas context missing.");

        const off = ensureOffscreen();
        const octx = off.getContext("2d", { willReadFrequently: true });
        if (!octx) throw new Error("Offscreen context missing.");

        // Optional built-in FaceDetector (fallback lock-box if MediaPipe fails).
        type FaceDetection = { boundingBox: DOMRectReadOnly };
        type FaceDetectorLike = { detect: (img: ImageBitmapSource) => Promise<FaceDetection[]> };
        const maybeFaceDetector = (globalThis as unknown as { FaceDetector?: new () => FaceDetectorLike }).FaceDetector;
        const faceDetector: FaceDetectorLike | null =
          typeof maybeFaceDetector === "function" ? new maybeFaceDetector() : null;

        // MediaPipe FaceMesh + Pose (preferred).
        type FaceLandmarkerLike = {
          detectForVideo: (video: HTMLVideoElement, ts: number) => { faceLandmarks?: NormalizedLandmark[][] };
        };
        type PoseLandmarkerLike = {
          detectForVideo: (video: HTMLVideoElement, ts: number) => { landmarks?: NormalizedLandmark[][] };
        };

        let faceLandmarker: FaceLandmarkerLike | null = null;
        let poseLandmarker: PoseLandmarkerLike | null = null;

        try {
          setMpStatus("loading");
          const visionMod = await import("@mediapipe/tasks-vision");
          const vision = await visionMod.FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
          );
          // VIDEO mode for stable tracking.
          const fl = await visionMod.FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          });
          const pl = await visionMod.PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numPoses: 1,
          });
          faceLandmarker = fl as unknown as FaceLandmarkerLike;
          poseLandmarker = pl as unknown as PoseLandmarkerLike;
          setMpStatus("ready");
        } catch {
          faceLandmarker = null;
          poseLandmarker = null;
          setMpStatus("failed");
        }

        // Movement/jitter estimation using low-res frame diff.
        let prev: Uint8ClampedArray | null = null;
        let movementEMA = 0;
        let jitterEMA = 0;
        let centeringEMA = 0.65; // assume decent centering until detected
        let stabilityEMA = 0.65;

        // Smoothing buffers
        const smoothFace: Array<{ x: number; y: number } | null> = [];
        const smoothPose: Array<{ x: number; y: number } | null> = [];
        let smoothBox: { x: number; y: number; w: number; h: number } | null = null;

        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const SMOOTH_T = 0.2;

        const smoothPoints = (
          src: NormalizedLandmark[] | null,
          dest: Array<{ x: number; y: number } | null>,
        ) => {
          if (!src) return null;
          for (let i = 0; i < src.length; i += 1) {
            const p = src[i]!;
            const x = p.x;
            const y = p.y;
            const prev = dest[i];
            dest[i] = prev
              ? { x: lerp(prev.x, x, SMOOTH_T), y: lerp(prev.y, y, SMOOTH_T) }
              : { x, y };
          }
          return dest;
        };

        const bboxFromLandmarks = (pts: Array<{ x: number; y: number } | null>, idxs: number[]) => {
          let minX = 1,
            minY = 1,
            maxX = 0,
            maxY = 0;
          for (const i of idxs) {
            const p = pts[i];
            if (!p) continue;
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          }
          if (maxX <= minX || maxY <= minY) return null;
          const pad = 0.06;
          const x = clamp(minX - pad, 0, 1);
          const y = clamp(minY - pad, 0, 1);
          const w = clamp(maxX - minX + pad * 2, 0, 1);
          const h = clamp(maxY - minY + pad * 2, 0, 1);
          return { x, y, w, h };
        };

        const draw = async () => {
          const v = videoRef.current;
          const can = canvasRef.current;
          if (!v || !can) return;

          const w = v.videoWidth || 1280;
          const h = v.videoHeight || 720;

          // Fit to container
          const targetW = can.clientWidth || 640;
          const targetH = can.clientHeight || 360;
          if (can.width !== targetW || can.height !== targetH) {
            can.width = targetW;
            can.height = targetH;
          }

          // Draw overlay based on video -> canvas coords (cover)
          const sx = 0;
          const sy = 0;
          const sw = w;
          const sh = h;
          const dw = can.width;
          const dh = can.height;

          ctx.clearRect(0, 0, dw, dh);

          // Low-res sampling for movement/jitter
          const sampleW = 96;
          const sampleH = 54;
          off.width = sampleW;
          off.height = sampleH;
          octx.drawImage(v, sx, sy, sw, sh, 0, 0, sampleW, sampleH);
          const img = octx.getImageData(0, 0, sampleW, sampleH).data;

          if (prev) {
            let sum = 0;
            let sumAbs = 0;
            for (let i = 0; i < img.length; i += 4) {
              // luminance-ish
              const cur = (img[i] * 2 + img[i + 1] * 3 + img[i + 2]) / 6;
              const prv = (prev[i] * 2 + prev[i + 1] * 3 + prev[i + 2]) / 6;
              const d = cur - prv;
              sum += d;
              sumAbs += Math.abs(d);
            }
            const mean = sum / (img.length / 4);
            const meanAbs = sumAbs / (img.length / 4);
            const jitter = clamp(meanAbs / 26, 0, 1);
            const movement = clamp((Math.abs(mean) + meanAbs * 0.35) / 22, 0, 1);

            // stability = inverse of movement + jitter
            const stability = clamp(1 - (movement * 0.65 + jitter * 0.55), 0, 1);

            // EMAs
            movementEMA = movementEMA * 0.88 + movement * 0.12;
            jitterEMA = jitterEMA * 0.88 + jitter * 0.12;
            stabilityEMA = stabilityEMA * 0.90 + stability * 0.10;
          }
          prev = img.slice() as unknown as Uint8ClampedArray;

          // MediaPipe inference (preferred).
          let facePts: Array<{ x: number; y: number } | null> | null = null;
          let posePts: Array<{ x: number; y: number } | null> | null = null;
          let faceBox: FaceBox = null;

          if (faceLandmarker) {
            const fr = faceLandmarker.detectForVideo(v, performance.now());
            const flm = fr.faceLandmarks?.[0] ?? null;
            if (flm) {
              facePts = smoothPoints(flm, smoothFace);
              // Use a few stable indices for bbox (forehead/chin/cheeks-ish)
              const box = facePts ? bboxFromLandmarks(facePts, [10, 152, 234, 454, 1, 33, 263]) : null;
              if (box) {
                lastSeenFaceTs = performance.now();
                // Smooth box.
                smoothBox = smoothBox
                  ? {
                      x: lerp(smoothBox.x, box.x, 0.18),
                      y: lerp(smoothBox.y, box.y, 0.18),
                      w: lerp(smoothBox.w, box.w, 0.18),
                      h: lerp(smoothBox.h, box.h, 0.18),
                    }
                  : box;
                faceBox = smoothBox;

                const cx = faceBox.x + faceBox.w / 2;
                const cy = faceBox.y + faceBox.h / 2;
                const dist = Math.hypot(cx - 0.5, cy - 0.5);
                const centering = clamp(1 - dist * 1.7, 0, 1);
                centeringEMA = centeringEMA * 0.90 + centering * 0.10;
              }
            }
          }

          if (poseLandmarker) {
            const pr = poseLandmarker.detectForVideo(v, performance.now());
            const plm = pr.landmarks?.[0] ?? null;
            if (plm) {
              posePts = smoothPoints(plm, smoothPose);
            }
          }

          // Fallback face box via FaceDetector when MediaPipe not available or lost.
          if (!faceBox && faceDetector) {
            try {
              const faces = await faceDetector.detect(v);
              const bb = faces[0]?.boundingBox;
              if (bb) {
                lastSeenFaceTs = performance.now();
                const box = { x: bb.x / w, y: bb.y / h, w: bb.width / w, h: bb.height / h };
                smoothBox = smoothBox
                  ? {
                      x: lerp(smoothBox.x, box.x, 0.12),
                      y: lerp(smoothBox.y, box.y, 0.12),
                      w: lerp(smoothBox.w, box.w, 0.12),
                      h: lerp(smoothBox.h, box.h, 0.12),
                    }
                  : box;
                faceBox = smoothBox;

                const cx = faceBox.x + faceBox.w / 2;
                const cy = faceBox.y + faceBox.h / 2;
                const dist = Math.hypot(cx - 0.5, cy - 0.5);
                const centering = clamp(1 - dist * 1.7, 0, 1);
                centeringEMA = centeringEMA * 0.90 + centering * 0.10;
              }
            } catch {
              // ignore
            }
          }

          if (!faceBox) {
            const proxy = clamp(0.55 + stabilityEMA * 0.35 - movementEMA * 0.15, 0, 1);
            centeringEMA = centeringEMA * 0.98 + proxy * 0.02;
          }

          // Draw "scan" overlay
          ctx.save();
          ctx.globalCompositeOperation = "source-over";

          const scanIntensity = scanIntensityRef.current;

          // Vignette
          const vg = ctx.createRadialGradient(dw / 2, dh / 2, Math.min(dw, dh) * 0.25, dw / 2, dh / 2, Math.max(dw, dh) * 0.75);
          vg.addColorStop(0, `rgba(2, 6, 23, ${0.12 + scanIntensity * 0.10})`);
          vg.addColorStop(1, `rgba(2, 6, 23, ${0.62})`);
          ctx.fillStyle = vg;
          ctx.fillRect(0, 0, dw, dh);

          // Grid overlay (slow vertical drift)
          const gridStep = 32;
          const drift = (performance.now() / 90) % gridStep;
          ctx.strokeStyle = `rgba(34, 197, 94, ${0.05 + scanIntensity * 0.12})`;
          ctx.lineWidth = 1;
          for (let x = 0; x < dw; x += gridStep) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, -gridStep);
            ctx.lineTo(x + 0.5, dh + gridStep);
            ctx.stroke();
          }
          for (let y = -gridStep; y < dh + gridStep; y += gridStep) {
            const yy = y + drift;
            ctx.beginPath();
            ctx.moveTo(0, yy + 0.5);
            ctx.lineTo(dw, yy + 0.5);
            ctx.stroke();
          }

          // CRT scanlines
          ctx.fillStyle = "rgba(255,255,255,0.02)";
          for (let y = 0; y < dh; y += 7) {
            ctx.fillRect(0, y, dw, 1);
          }

          // Film grain (very light)
          const grain = 0.035;
          ctx.fillStyle = `rgba(255,255,255,${grain})`;
          for (let i = 0; i < 120; i += 1) {
            const gx = Math.random() * dw;
            const gy = Math.random() * dh;
            ctx.fillRect(gx, gy, 1, 1);
          }

          // Scan line (speed increases early)
          const speed = 0.9 + Math.max(0, 1.4 - (performance.now() - startedAt) / 2500);
          const lineY = ((performance.now() / (1600 / speed)) % 1) * dh;
          ctx.save();
          ctx.shadowColor = `rgba(34,197,94,${0.55})`;
          ctx.shadowBlur = 18;
          ctx.strokeStyle = `rgba(34,197,94,${0.85})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, lineY);
          ctx.lineTo(dw, lineY);
          ctx.stroke();
          ctx.restore();

          // Target lock system
          const haveFace = !!faceBox;
          const lostForMs = performance.now() - lastSeenFaceTs;
          const reacquiring = !haveFace && lastSeenFaceTs > 0 && lostForMs < 2500;

          if (haveFace && faceBox) {
            const fx = faceBox.x * dw;
            const fy = faceBox.y * dh;
            const fw = faceBox.w * dw;
            const fh = faceBox.h * dh;
            const pulse = 1 + Math.sin(performance.now() / 260) * 0.01;
            const cx = fx + fw / 2;
            const cy = fy + fh / 2;
            const pw = fw * pulse;
            const ph = fh * pulse;
            const px = cx - pw / 2;
            const py = cy - ph / 2;

            ctx.save();
            ctx.shadowColor = `rgba(34,197,94,${0.45})`;
            ctx.shadowBlur = 18;
            ctx.strokeStyle = `rgba(34,197,94,${0.78})`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px, py, pw, ph);
            ctx.restore();

            // labels
            ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
            ctx.fillStyle = `rgba(34,197,94,${0.85})`;
            ctx.fillText("FACE LOCK", px + 8, py - 10);
            ctx.fillStyle = `rgba(255,255,255,${0.55})`;
            ctx.fillText("TRACKING", px + 8, py - 24);
          } else if (reacquiring) {
            ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
            ctx.fillStyle = "rgba(255,255,255,0.65)";
            ctx.fillText("REACQUIRING TARGET…", 24, 40);
          }

          // Face mesh (cinematic: only a few connections, not all points)
          if (facePts) {
            const lineAlpha = 0.55 + scanIntensity * 0.25;
            ctx.save();
            ctx.shadowColor = `rgba(34,197,94,${0.35})`;
            ctx.shadowBlur = 14;
            ctx.strokeStyle = `rgba(34,197,94,${lineAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.lineCap = "round";

            // Minimal set of connections (eyes + mouth outline)
            const segs: Array<[number, number]> = [
              [33, 133],
              [362, 263],
              [61, 291],
              [61, 13],
              [13, 291],
              [33, 1],
              [263, 1],
            ];
            for (const [a, b] of segs) {
              const A = facePts[a];
              const B = facePts[b];
              if (!A || !B) continue;
              ctx.beginPath();
              ctx.moveTo(A.x * dw, A.y * dh);
              ctx.lineTo(B.x * dw, B.y * dh);
              ctx.stroke();
            }
            ctx.restore();
          }

          // Pose skeleton (thicker than face, rounded caps, subtle pulse)
          if (posePts) {
            const pulse = 0.82 + Math.sin(performance.now() / 420) * 0.08;
            ctx.save();
            ctx.shadowColor = `rgba(34,197,94,${0.28})`;
            ctx.shadowBlur = 18;
            ctx.strokeStyle = `rgba(34,197,94,${0.55 + scanIntensity * 0.30})`;
            ctx.lineWidth = 2.6 * pulse;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            const segs: Array<[number, number]> = [
              [11, 13],
              [13, 15],
              [12, 14],
              [14, 16],
              [11, 12],
              [11, 23],
              [12, 24],
              [23, 24],
              [23, 25],
              [25, 27],
              [24, 26],
              [26, 28],
            ];
            for (const [a, b] of segs) {
              const A = posePts[a];
              const B = posePts[b];
              if (!A || !B) continue;
              ctx.beginPath();
              ctx.moveTo(A.x * dw, A.y * dh);
              ctx.lineTo(B.x * dw, B.y * dh);
              ctx.stroke();
            }
            ctx.restore();
          }

          // UI / phase state updates (throttled)
          const elapsed = performance.now() - startedAt;
          const phase = Math.min(4, Math.floor(elapsed / phaseMs));
          if (phase !== lastPhase) {
            lastPhase = phase;
            if (phase === 0) setPhaseText("INITIALIZING…");
            if (phase === 1) setPhaseText(haveFace ? "FACE LOCKED" : "SEARCHING FACE…");
            if (phase === 2) setPhaseText("MAPPING STRUCTURE…");
            if (phase === 3) setPhaseText("ANALYZING PATTERN…");
            if (phase >= 4) setPhaseText("COMPLETE");
          }

          if (performance.now() - lastUiUpdate > 180) {
            lastUiUpdate = performance.now();
            setLockText(haveFace ? "FACE LOCK" : reacquiring ? "REACQUIRING TARGET…" : "NO TARGET");
            setMetrics((m) => {
              const next = {
                movement: movementEMA,
                stability: stabilityEMA,
                centering: centeringEMA,
                jitter: jitterEMA,
              };
              const delta =
                Math.abs(next.movement - m.movement) +
                Math.abs(next.stability - m.stability) +
                Math.abs(next.centering - m.centering) +
                Math.abs(next.jitter - m.jitter);
              return delta > 0.02 ? next : m;
            });
          }

          ctx.restore();

          if (elapsed >= analyzeDurationMs && status !== "done") {
            stop();

            const movement = clamp(movementEMA, 0, 1);
            const stability = clamp(stabilityEMA, 0, 1);
            const centering = clamp(centeringEMA, 0, 1);
            const jitter = clamp(jitterEMA, 0, 1);

            const personality = pickPersonality({ movement, stability, centering, jitter });
            const confidencePct = Math.round(
              clamp(0.35 + stability * 0.30 + centering * 0.25 + (1 - jitter) * 0.20, 0, 0.99) * 100,
            );
            const energyPct = Math.round(clamp(movement * 0.75 + jitter * 0.25, 0, 1) * 100);

            setResult({ personality, confidencePct, energyPct });
            setStatus("done");
            return;
          }

          rafRef.current = requestAnimationFrame(() => {
            void draw();
          });
        };

        rafRef.current = requestAnimationFrame(() => {
          void draw();
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Camera error";
        setErrorMsg(msg);
        setStatus("error");
      }
    };

    void run();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-full w-full p-4">
      <div className="h-full w-full rounded-2xl os-glass os-liquid-edge border border-slate-900/10 overflow-hidden">
        <div className="relative h-full w-full bg-slate-950/75">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover opacity-90"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {/* scanline */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-400/30 to-transparent os-scanline" />

          {/* header */}
          <div className="absolute left-4 top-4 right-4 flex items-start justify-between">
            <div className="rounded-2xl bg-black/35 backdrop-blur px-4 py-3 border border-emerald-400/20">
              <div className="font-mono text-[12px] tracking-widest text-emerald-200/90">
                CAMERA SCAN
              </div>
              <div className="mt-1 font-mono text-[11px] text-emerald-100/60">
                {status === "requesting" && "REQUESTING CAMERA…"}
                {status === "running" && (
                  <span className="os-analyzing">{phaseText}</span>
                )}
                {status === "error" && "CAMERA ERROR"}
                {status === "done" && "COMPLETE"}
              </div>
              <div className="mt-1 font-mono text-[10px] text-emerald-100/45">
                mp: {mpStatus} · {lockText ?? ""}
              </div>
            </div>

            <div className="hidden sm:block rounded-2xl bg-black/35 backdrop-blur px-4 py-3 border border-emerald-400/10">
              <div className="font-mono text-[11px] text-emerald-100/60">signals</div>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-emerald-100/80">
                <div>move</div>
                <div className="text-right">{Math.round(metrics.movement * 100)}%</div>
                <div>stable</div>
                <div className="text-right">{Math.round(metrics.stability * 100)}%</div>
                <div>center</div>
                <div className="text-right">{Math.round(metrics.centering * 100)}%</div>
                <div>jitter</div>
                <div className="text-right">{Math.round(metrics.jitter * 100)}%</div>
              </div>
            </div>
          </div>

          {/* output */}
          <div className="absolute left-4 right-4 bottom-4">
            {status === "error" ? (
              <div className="rounded-2xl border border-rose-400/25 bg-black/35 backdrop-blur px-4 py-3 text-sm text-rose-100">
                {errorMsg ?? "Could not access camera. Check browser permissions."}
              </div>
            ) : status !== "done" ? (
              <div className="rounded-2xl border border-emerald-400/15 bg-black/35 backdrop-blur px-4 py-3">
                <div className="font-mono text-[12px] text-emerald-100/80">
                  Hold still for {Math.round(analyzeDurationMs / 1000)}s…
                </div>
                <div className="mt-1 font-mono text-[11px] text-emerald-100/55">
                  (Based only on movement, posture stability, face centering, jitter)
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-400/20 bg-black/40 backdrop-blur px-4 py-3 font-mono text-[13px] text-emerald-100">
                {/* AFTER 3–5 SECONDS OUTPUT ONLY */}
                <div>{result?.personality}</div>
                <div>Confidence: {result?.confidencePct}%</div>
                <div>Energy: {result?.energyPct}%</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

