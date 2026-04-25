"use client";

import { useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

type AnalysisResult = {
  personality: "Calm" | "Active" | "Shy" | "Emotional" | "Focused" | "Restless" | "Neutral";
  confidencePct: number;
  energyPct: number;
  egoPct: number;
  iqIndex: number;
  eqIndex: number;
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
  const startedAtRef = useRef<number>(0);

  const [status, setStatus] = useState<
    "idle" | "requesting" | "running" | "error" | "done"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [mpStatus, setMpStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");

  const [metrics, setMetrics] = useState({
    movement: 0,
    stability: 0,
    centering: 0,
    jitter: 0,
  });

  // Ultra-fast scan (sub-1s). Still samples multiple frames for motion.
  const phaseMs = 220;
  const analyzeDurationMs = 4 * phaseMs; // ~880ms

  // Status text updated infrequently; drawing is canvas-only.
  const [phaseText, setPhaseText] = useState("INITIALIZING…");
  const didFinishRef = useRef(false);
  const lastPublishRef = useRef(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
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

        startedAtRef.current = performance.now();
        didFinishRef.current = false;
        lastPublishRef.current = 0;
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

        // MediaPipe FaceMesh + Pose + Hands (preferred).
        type FaceLandmarkerLike = {
          detectForVideo: (video: HTMLVideoElement, ts: number) => { faceLandmarks?: NormalizedLandmark[][] };
        };
        type PoseLandmarkerLike = {
          detectForVideo: (video: HTMLVideoElement, ts: number) => { landmarks?: NormalizedLandmark[][] };
        };
        type HandLandmarkerLike = {
          detectForVideo: (video: HTMLVideoElement, ts: number) => { landmarks?: NormalizedLandmark[][] };
        };

        let faceLandmarker: FaceLandmarkerLike | null = null;
        let poseLandmarker: PoseLandmarkerLike | null = null;
        let handLandmarker: HandLandmarkerLike | null = null;

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
          const hl = await visionMod.HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 2,
          });
          faceLandmarker = fl as unknown as FaceLandmarkerLike;
          poseLandmarker = pl as unknown as PoseLandmarkerLike;
          handLandmarker = hl as unknown as HandLandmarkerLike;
          setMpStatus("ready");
        } catch {
          faceLandmarker = null;
          poseLandmarker = null;
          handLandmarker = null;
          setMpStatus("failed");
        }

        // Movement/jitter estimation using low-res frame diff.
        let prev: Uint8ClampedArray | null = null;
        let movementEMA = 0;
        let jitterEMA = 0;
        let centeringEMA = 0.65; // assume decent centering until detected
        let stabilityEMA = 0.65;
        let poseMotionEMA = 0;
        let faceMotionEMA = 0;
        let prevPoseCenter: { x: number; y: number } | null = null;
        let prevFaceCenter: { x: number; y: number } | null = null;

        // Smoothing buffers
        const smoothFace: Array<{ x: number; y: number } | null> = [];
        const smoothPose: Array<{ x: number; y: number } | null> = [];
        const smoothHands: Array<Array<{ x: number; y: number } | null>> = [[], []];
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
          let handPts: Array<Array<{ x: number; y: number } | null>> | null = null;
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

          if (handLandmarker) {
            const hr = handLandmarker.detectForVideo(v, performance.now());
            const h0 = hr.landmarks?.[0] ?? null;
            const h1 = hr.landmarks?.[1] ?? null;
            const a = h0 ? smoothPoints(h0, smoothHands[0]!) : null;
            const b = h1 ? smoothPoints(h1, smoothHands[1]!) : null;
            handPts = [];
            if (a) handPts.push(a);
            if (b) handPts.push(b);
            if (handPts.length === 0) handPts = null;
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

          // Extra motion signal: landmark-based motion (catches jumping/waving better than frame-diff alone).
          // We compute a simple "center" for face and pose and track its velocity.
          if (posePts) {
            const idxs = [11, 12, 23, 24]; // shoulders + hips (stable torso anchors)
            let sx = 0,
              sy = 0,
              n = 0;
            for (const i of idxs) {
              const p = posePts[i];
              if (!p) continue;
              sx += p.x;
              sy += p.y;
              n += 1;
            }
            if (n > 0) {
              const c = { x: sx / n, y: sy / n };
              if (prevPoseCenter) {
                const d = Math.hypot(c.x - prevPoseCenter.x, c.y - prevPoseCenter.y);
                // scale to 0..1-ish for typical movements
                const m = clamp(d * 12, 0, 1);
                poseMotionEMA = poseMotionEMA * 0.82 + m * 0.18;
              }
              prevPoseCenter = c;
            }
          }

          if (faceBox) {
            const c = { x: faceBox.x + faceBox.w / 2, y: faceBox.y + faceBox.h / 2 };
            if (prevFaceCenter) {
              const d = Math.hypot(c.x - prevFaceCenter.x, c.y - prevFaceCenter.y);
              const m = clamp(d * 18, 0, 1);
              faceMotionEMA = faceMotionEMA * 0.82 + m * 0.18;
            }
            prevFaceCenter = c;
          }

          // Merge motion signals: take the strongest cue.
          const mergedMotion = Math.max(movementEMA, poseMotionEMA, faceMotionEMA);
          movementEMA = movementEMA * 0.55 + mergedMotion * 0.45;

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

          // Face outline + key features (more realistic than minimal lines)
          if (facePts) {
            ctx.save();
            // Use OS accent for visibility across themes.
            ctx.shadowColor = `rgba(var(--os-accent) / 0.65)`;
            ctx.shadowBlur = 22;
            ctx.strokeStyle = `rgba(var(--os-accent) / ${0.82 + scanIntensity * 0.14})`;
            ctx.lineWidth = 2.8;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            const FACE_OVAL = [
              10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
              176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10,
            ];

            const drawPath = (idxs: number[]) => {
              let started = false;
              ctx.beginPath();
              for (const i of idxs) {
                const p = facePts[i];
                if (!p) continue;
                const x = p.x * dw;
                const y = p.y * dh;
                if (!started) {
                  ctx.moveTo(x, y);
                  started = true;
                } else {
                  ctx.lineTo(x, y);
                }
              }
              if (started) ctx.stroke();
            };

            // outline
            drawPath(FACE_OVAL);

            // eyes (simple loops)
            drawPath([33, 160, 158, 133, 153, 144, 33]);
            drawPath([362, 385, 387, 263, 373, 380, 362]);

            // mouth
            drawPath([61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 61]);

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

          // Hand skeletons
          if (handPts) {
            const HAND: Array<[number, number]> = [
              [0, 1],
              [1, 2],
              [2, 3],
              [3, 4],
              [0, 5],
              [5, 6],
              [6, 7],
              [7, 8],
              [5, 9],
              [9, 10],
              [10, 11],
              [11, 12],
              [9, 13],
              [13, 14],
              [14, 15],
              [15, 16],
              [13, 17],
              [17, 18],
              [18, 19],
              [19, 20],
              [0, 17],
            ];

            ctx.save();
            ctx.shadowColor = `rgba(56,189,248,${0.25})`;
            ctx.shadowBlur = 16;
            ctx.strokeStyle = `rgba(56,189,248,${0.55 + scanIntensity * 0.25})`;
            ctx.lineWidth = 2.0;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            for (const hpts of handPts) {
              for (const [a, b] of HAND) {
                const A = hpts[a];
                const B = hpts[b];
                if (!A || !B) continue;
                ctx.beginPath();
                ctx.moveTo(A.x * dw, A.y * dh);
                ctx.lineTo(B.x * dw, B.y * dh);
                ctx.stroke();
              }
            }
            ctx.restore();
          }

          // UI / phase state updates (throttled)
          const elapsed = performance.now() - startedAtRef.current;
          const phase = Math.min(4, Math.floor(elapsed / phaseMs));
          if (phase !== lastPhase) {
            lastPhase = phase;
            if (phase === 0) setPhaseText("INITIALIZING…");
            if (phase === 1) setPhaseText("MAPPING…");
            if (phase === 2) setPhaseText("ANALYZING…");
            if (phase === 3) setPhaseText("FINALIZING…");
            if (phase >= 4) setPhaseText("COMPLETE");
          }

          if (performance.now() - lastUiUpdate > 180) {
            lastUiUpdate = performance.now();
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

          const publish = () => {
            const movement = clamp(movementEMA, 0, 1);
            const stability = clamp(stabilityEMA, 0, 1);
            const centering = clamp(centeringEMA, 0, 1);
            const jitter = clamp(jitterEMA, 0, 1);

            const personality = pickPersonality({ movement, stability, centering, jitter });
            const confidencePct = Math.round(
              clamp(0.35 + stability * 0.30 + centering * 0.25 + (1 - jitter) * 0.20, 0, 0.99) * 100,
            );

            // Energy: motion-heavy and continuously updated (no longer stuck).
            const motion = clamp(Math.max(movement, poseMotionEMA, faceMotionEMA), 0, 1);
            const energyPct = Math.round(clamp(motion * 0.92 + jitter * 0.08, 0, 1) * 100);

            // Extra fun indices (still derived only from the same 4 signals).
            const egoPct = Math.round(clamp(centering * 0.75 + (1 - stability) * 0.25, 0, 1) * 100);
            const iqIndex = Math.round(80 + clamp(stability * 0.65 + (1 - jitter) * 0.35, 0, 1) * 60);
            const eqIndex = Math.round(
              80 + clamp((1 - jitter) * 0.55 + centering * 0.25 + stability * 0.20, 0, 1) * 60,
            );

            const out = { personality, confidencePct, energyPct, egoPct, iqIndex, eqIndex };
            setResult(out);
            setStatus("done");
            setShowResult(true);

            // Publish for Terminal `whoami`
            try {
              localStorage.setItem(
                "zza-os:whoami:last",
                JSON.stringify({ ts: Date.now(), ...out }),
              );
            } catch {
              // ignore
            }
          };

          // Publish first result quickly, then keep refining in the background.
          if (elapsed >= analyzeDurationMs && !didFinishRef.current) {
            didFinishRef.current = true;
            publish();
          } else if (didFinishRef.current) {
            const nowTs = performance.now();
            if (nowTs - lastPublishRef.current > 650) {
              lastPublishRef.current = nowTs;
              publish();
            }
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
                mp: {mpStatus}
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
                  Scanning…
                </div>
                <div className="mt-1 font-mono text-[11px] text-emerald-100/55">
                  (Based only on movement, posture stability, face centering, jitter)
                </div>
              </div>
            ) : showResult ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-black/40 backdrop-blur px-4 py-3 font-mono text-[13px] text-emerald-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {/* OUTPUT */}
                    <div>{result?.personality}</div>
                    <div>Confidence: {result?.confidencePct}%</div>
                    <div>Energy: {result?.energyPct}%</div>
                    <div>Ego: {result?.egoPct}%</div>
                    <div>IQ Index: {result?.iqIndex}</div>
                    <div>EQ Index: {result?.eqIndex}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowResult(false)}
                    className="shrink-0 h-8 w-9 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-[12px] font-mono text-emerald-100/80"
                    title="Close"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      // Restart scan timer without stopping camera.
                      didFinishRef.current = false;
                      lastPublishRef.current = 0;
                      startedAtRef.current = performance.now();
                      setStatus("running");
                      setShowResult(false);
                    }}
                    className="rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 px-3 py-2 text-[11px] font-mono text-emerald-100/80"
                  >
                    Rescan
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

