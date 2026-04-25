"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addVoiceRecording,
  getVoiceRecordingBlob,
  listVoiceRecordings,
  loadVoiceMetas,
  removeVoiceRecording,
  type VoiceRecordingMeta,
} from "@/lib/os/voiceDb";

function uid() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

function fmtTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

export function VoiceRecorderApp() {
  const [supported] = useState(() => typeof window !== "undefined" && typeof MediaRecorder !== "undefined");
  const [permError, setPermError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [items, setItems] = useState<VoiceRecordingMeta[]>(() => (typeof window === "undefined" ? [] : loadVoiceMetas()));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const canRecord = useMemo(() => supported && !busy, [busy, supported]);

  const refresh = async () => {
    const list = await listVoiceRecordings();
    setItems(list);
  };

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (activeUrl) URL.revokeObjectURL(activeUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTick = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
  };

  const startTick = () => {
    stopTick();
    tickRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 100);
  };

  const start = async () => {
    if (!canRecord) return;
    setPermError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      setElapsedMs(0);
      startedAtRef.current = Date.now();
      startTick();

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stopTick();
        const durationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        chunksRef.current = [];

        // stop mic
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        // persist
        setBusy(true);
        try {
          const meta: VoiceRecordingMeta = {
            id: uid(),
            createdAt: Date.now(),
            durationMs,
            mimeType: blob.type || "audio/webm",
          };
          await addVoiceRecording(meta, blob);
          await refresh();
        } finally {
          setBusy(false);
        }
      };

      mr.start(200);
      setIsRecording(true);
    } catch (e) {
      stopTick();
      setIsRecording(false);
      const msg = e instanceof Error ? e.message : "Microphone permission denied.";
      setPermError(msg);
    }
  };

  const stop = () => {
    if (!isRecording) return;
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // ignore
    } finally {
      setIsRecording(false);
    }
  };

  const open = async (id: string) => {
    setActiveId(id);
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    setActiveUrl(null);
    setBusy(true);
    try {
      const blob = await getVoiceRecordingBlob(id);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setActiveUrl(url);
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    setBusy(true);
    try {
      await removeVoiceRecording(id);
      if (activeId === id) {
        setActiveId(null);
        if (activeUrl) URL.revokeObjectURL(activeUrl);
        setActiveUrl(null);
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Voice Recorder</div>
        <div className="text-[11px] font-mono text-zinc-300/60">{supported ? "mic" : "unsupported"}</div>
      </div>

      <div className="mt-3 grid grid-cols-12 gap-3 h-[calc(100%-44px)] min-h-0">
        <div className="col-span-7 rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden min-h-0 flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
            <div className="text-xs tracking-widest text-zinc-200/80">CONTROL</div>
            <div className="text-[11px] font-mono text-[rgb(var(--os-accent))]">{fmtTime(elapsedMs)}</div>
          </div>
          <div className="p-4">
            {!supported ? (
              <div className="text-zinc-200/70">Your browser does not support recording (MediaRecorder).</div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canRecord || isRecording}
                    onClick={() => void start()}
                    className={[
                      "h-10 px-4 rounded-2xl border border-white/10 font-semibold",
                      isRecording ? "bg-black/20 text-zinc-300/60" : "bg-[rgba(var(--os-accent),0.16)] hover:bg-[rgba(var(--os-accent),0.22)]",
                      busy ? "opacity-70" : "",
                    ].join(" ")}
                  >
                    Record
                  </button>
                  <button
                    type="button"
                    disabled={!isRecording}
                    onClick={stop}
                    className="h-10 px-4 rounded-2xl border border-white/10 bg-black/20 hover:bg-black/30 font-semibold"
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void refresh()}
                    className="h-10 px-4 rounded-2xl border border-white/10 bg-black/20 hover:bg-black/30 font-mono text-[12px]"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-3 text-[11px] text-zinc-300/60">
                  Recording is saved locally in this browser (IndexedDB).
                </div>

                {permError && <div className="mt-3 text-[12px] text-rose-200/80">{permError}</div>}
              </>
            )}
          </div>

          <div className="px-4 py-3 border-t border-white/10 bg-black/10 flex items-center justify-between">
            <div className="text-[11px] font-mono text-zinc-300/60">{items.length} recordings</div>
            <div className="h-2 w-2 rounded-full bg-[rgb(var(--os-accent))] shadow-[0_0_18px_rgba(var(--os-accent),0.22)]" />
          </div>
        </div>

        <div className="col-span-5 rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden min-h-0 flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
            <div className="text-xs tracking-widest text-zinc-200/80">LIBRARY</div>
            <div className="text-[11px] font-mono text-zinc-300/60">{busy ? "busy…" : "ready"}</div>
          </div>

          <div className="p-3 min-h-0 overflow-auto space-y-2">
            {items.length === 0 ? (
              <div className="p-3 text-zinc-200/70">No recordings yet. Hit Record.</div>
            ) : (
              items.map((it) => (
                <div
                  key={it.id}
                  className={[
                    "rounded-2xl border px-3 py-2 bg-black/20",
                    it.id === activeId ? "border-white/20" : "border-white/10",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void open(it.id)}
                      className="text-left min-w-0"
                      title="Open"
                    >
                      <div className="text-sm text-zinc-100/90 truncate">
                        {new Date(it.createdAt).toLocaleString()}
                      </div>
                      <div className="mt-1 text-[11px] font-mono text-zinc-300/60 truncate">
                        {fmtTime(it.durationMs)} · {it.mimeType}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => void del(it.id)}
                      className="shrink-0 h-8 w-9 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-[11px] font-mono text-zinc-200/70"
                      title="Delete"
                      aria-label="Delete"
                      disabled={busy}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-white/10 bg-black/10">
            {activeUrl ? (
              <audio src={activeUrl} controls className="w-full" />
            ) : (
              <div className="text-[11px] text-zinc-300/60">Select a recording to play.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

