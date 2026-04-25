"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SourceKind = "ambient" | "fileOrUrl";

export function MusicPlayerApp() {
  const [sourceKind, setSourceKind] = useState<SourceKind>("ambient");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [trackLabel, setTrackLabel] = useState("Ambient Loop");
  const [urlInput, setUrlInput] = useState("");
  const [notice, setNotice] = useState<string | null>(
    "Tip: drag & drop an audio file (mp3/wav/ogg), or paste a direct audio URL.",
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaSrcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Ambient synth nodes (procedural loop, no asset needed)
  const ambientNodesRef = useRef<{
    oscA: OscillatorNode;
    oscB: OscillatorNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
    filter: BiquadFilterNode;
    outGain: GainNode;
  } | null>(null);

  const fftSize = 2048;
  const bars = 48;

  const isYoutubeLike = useMemo(() => {
    const v = urlInput.trim().toLowerCase();
    return v.includes("youtube.com") || v.includes("youtu.be");
  }, [urlInput]);

  const ensureAudioGraph = async () => {
    if (typeof window === "undefined") return;
    const audio = audioRef.current;
    if (!audio) return;

    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    if (!gainRef.current) {
      gainRef.current = ctx.createGain();
      gainRef.current.gain.value = volume;
    }
    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = fftSize;
      analyserRef.current.smoothingTimeConstant = 0.84;
    }

    // Media element source for file/url mode
    if (!mediaSrcRef.current) {
      mediaSrcRef.current = ctx.createMediaElementSource(audio);
    }

    // Connect: media -> gain -> analyser -> destination
    // (disconnect first to avoid duplicate connections in some browsers)
    try {
      mediaSrcRef.current.disconnect();
    } catch {}
    try {
      gainRef.current.disconnect();
    } catch {}
    try {
      analyserRef.current.disconnect();
    } catch {}

    mediaSrcRef.current.connect(gainRef.current);
    gainRef.current.connect(analyserRef.current);
    analyserRef.current.connect(ctx.destination);
  };

  const ensureAmbient = async () => {
    if (typeof window === "undefined") return;
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = fftSize;
      analyserRef.current.smoothingTimeConstant = 0.84;
    }
    if (!gainRef.current) {
      gainRef.current = ctx.createGain();
      gainRef.current.gain.value = volume;
    }

    if (!ambientNodesRef.current) {
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const outGain = ctx.createGain();

      oscA.type = "sawtooth";
      oscB.type = "triangle";
      oscA.frequency.value = 55; // A1
      oscB.frequency.value = 110; // A2

      filter.type = "lowpass";
      filter.frequency.value = 420;
      filter.Q.value = 0.9;

      // slow movement
      lfo.type = "sine";
      lfo.frequency.value = 0.065;
      lfoGain.gain.value = 120; // mod filter cutoff
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      outGain.gain.value = 0.28;

      oscA.connect(filter);
      oscB.connect(filter);
      filter.connect(outGain);
      outGain.connect(gainRef.current);
      gainRef.current.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);

      oscA.start();
      oscB.start();
      lfo.start();

      ambientNodesRef.current = { oscA, oscB, lfo, lfoGain, filter, outGain };
    }
  };

  useEffect(() => {
    // keep volume in sync
    if (gainRef.current) gainRef.current.gain.value = volume;
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const draw = () => {
      const can = canvasRef.current;
      const analyser = analyserRef.current;
      if (!can) return;
      const ctx = can.getContext("2d");
      if (!ctx) return;

      const w = can.clientWidth || 800;
      const h = can.clientHeight || 260;
      if (can.width !== w || can.height !== h) {
        can.width = w;
        can.height = h;
      }

      // background glassy dark
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.20)";
      ctx.fillRect(0, 0, w, h);

      // subtle grid
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
        ctx.stroke();
      }

      if (!analyser) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // frequency bars
      const freq = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freq);
      const step = Math.floor(freq.length / bars);
      const barW = (w - 32) / bars;
      const baseY = h - 18;

      for (let i = 0; i < bars; i += 1) {
        const v = freq[i * step] ?? 0;
        const p = v / 255;
        const bh = 10 + p * (h * 0.62);
        const x = 16 + i * barW;
        const y = baseY - bh;

        // neon-ish gradient based on OS accent
        const grad = ctx.createLinearGradient(0, y, 0, baseY);
        grad.addColorStop(0, "rgba(56,189,248,0.85)");
        grad.addColorStop(0.6, "rgba(168,85,247,0.55)");
        grad.addColorStop(1, "rgba(34,197,94,0.30)");
        ctx.fillStyle = grad;

        ctx.fillRect(x, y, Math.max(2, barW * 0.72), bh);
      }

      // waveform line
      const time = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(time);
      ctx.strokeStyle = "rgba(34,197,94,0.85)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(34,197,94,0.35)";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let i = 0; i < time.length; i += 6) {
        const t = time[i] ?? 128;
        const v = (t - 128) / 128;
        const x = (i / (time.length - 1)) * w;
        const y = h * 0.35 + v * (h * 0.12);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      // cleanup
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      try {
        mediaSrcRef.current?.disconnect();
      } catch {}
      try {
        analyserRef.current?.disconnect();
      } catch {}
      try {
        gainRef.current?.disconnect();
      } catch {}
      try {
        ctxRef.current?.close();
      } catch {}
      ctxRef.current = null;
      analyserRef.current = null;
      mediaSrcRef.current = null;
      gainRef.current = null;
      ambientNodesRef.current = null;
    };
  }, []);

  const play = async () => {
    setNotice(null);
    if (sourceKind === "ambient") {
      await ensureAmbient();
      setIsPlaying(true);
      return;
    }
    await ensureAudioGraph();
    const a = audioRef.current;
    if (!a?.src) {
      setNotice("Drop an audio file or paste a direct audio URL first.");
      return;
    }
    await a.play();
    setIsPlaying(true);
  };

  const pause = () => {
    if (sourceKind === "ambient") {
      // For ambient, we just mute by setting gain to 0 and stop drawing state.
      if (gainRef.current) gainRef.current.gain.value = 0;
      setIsPlaying(false);
      return;
    }
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  useEffect(() => {
    // restore gain when resuming ambient
    if (sourceKind === "ambient" && isPlaying && gainRef.current) {
      gainRef.current.gain.value = volume;
    }
  }, [isPlaying, sourceKind, volume]);

  const setFromFile = (file: File) => {
    const url = URL.createObjectURL(file);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.loop = true;
      audioRef.current.load();
    }
    setTrackLabel(file.name);
    setSourceKind("fileOrUrl");
    setNotice("Loaded local file. Press Play.");
    setIsPlaying(false);
  };

  const setFromUrl = (raw: string) => {
    const u = raw.trim();
    if (!u) return;
    if (u.toLowerCase().includes("youtube.com") || u.toLowerCase().includes("youtu.be")) {
      setNotice(
        "YouTube links can’t be played directly in-browser without a backend extractor. Paste a direct .mp3/.wav/.ogg URL or drop a file.",
      );
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = u;
      audioRef.current.loop = true;
      audioRef.current.load();
    }
    setTrackLabel(u);
    setSourceKind("fileOrUrl");
    setNotice("Loaded URL. Press Play (requires CORS-enabled audio URL).");
    setIsPlaying(false);
  };

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Music Player</div>
        <div className="text-[11px] font-mono text-zinc-300/60 truncate max-w-[60%]">
          {trackLabel}
        </div>
      </div>

      <div
        className="mt-3 h-[calc(100%-44px)] rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const f = e.dataTransfer.files?.[0];
          if (f) setFromFile(f);
        }}
      >
        <div className="p-4 border-b border-white/10 bg-black/20 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (isPlaying ? pause() : void play())}
              className="rounded-2xl border border-white/10 bg-black/25 hover:bg-black/35 px-4 py-2 text-sm os-accent-shadow"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>

            <button
              type="button"
              onClick={() => {
                setSourceKind("ambient");
                setTrackLabel("Ambient Loop");
                setNotice("Ambient synth ready. Press Play.");
                setIsPlaying(false);
              }}
              className={[
                "rounded-2xl border px-3 py-2 text-xs transition-colors",
                sourceKind === "ambient"
                  ? "border-white/18 bg-black/30 text-zinc-100"
                  : "border-white/10 bg-black/20 hover:bg-black/25 text-zinc-200/80",
              ].join(" ")}
            >
              Ambient
            </button>

            <button
              type="button"
              onClick={() => {
                setSourceKind("fileOrUrl");
                setNotice("Drop an audio file here or paste a direct audio URL.");
                setIsPlaying(false);
              }}
              className={[
                "rounded-2xl border px-3 py-2 text-xs transition-colors",
                sourceKind === "fileOrUrl"
                  ? "border-white/18 bg-black/30 text-zinc-100"
                  : "border-white/10 bg-black/20 hover:bg-black/25 text-zinc-200/80",
              ].join(" ")}
            >
              File / URL
            </button>

            <div className="ml-auto flex items-center gap-2">
              <div className="text-[11px] font-mono text-zinc-300/60">VOL</div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                className="w-36 accent-emerald-400"
              />
            </div>
          </div>

          {sourceKind === "fileOrUrl" && (
            <div className="flex items-center gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste direct audio URL (mp3/wav/ogg). YouTube links need a backend."
                className="flex-1 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[12px] font-mono outline-none placeholder:text-zinc-400"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setFromUrl(urlInput)}
                className="rounded-2xl border border-white/10 bg-black/25 hover:bg-black/35 px-3 py-2 text-xs"
              >
                Load
              </button>
            </div>
          )}

          {notice && (
            <div className={["text-[11px] font-mono", isYoutubeLike ? "text-rose-200/80" : "text-zinc-300/60"].join(" ")}>
              {notice}
            </div>
          )}
        </div>

        <div className="p-4 h-[calc(100%-132px)]">
          <canvas ref={canvasRef} className="h-full w-full rounded-2xl border border-white/10" />
          <div className="mt-2 text-[11px] text-zinc-300/60">
            Drop audio anywhere in this window to load. For URLs, the server must allow cross-origin audio playback.
          </div>
        </div>

        <audio ref={audioRef} loop preload="auto" />
      </div>
    </div>
  );
}

