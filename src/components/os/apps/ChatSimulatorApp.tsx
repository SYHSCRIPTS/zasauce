"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { connectChatWs, type ChatWireMsg, type WsState } from "@/lib/os/chatWs";

function isChatWireMsg(v: unknown): v is ChatWireMsg {
  if (!v || typeof v !== "object") return false;
  const t = (v as { type?: unknown }).type;
  return t === "join" || t === "typing" || t === "msg";
}

type Msg = {
  id: string;
  ts: number;
  userId: string;
  name: string;
  text: string;
  kind: "user" | "system";
};

type Typing = { userId: string; name: string; until: number };

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function now() {
  return Date.now();
}

function loadIdentity() {
  try {
    const raw = localStorage.getItem("zza-os:chat:identity");
    if (raw) return JSON.parse(raw) as { userId: string; name: string };
  } catch {}
  const userId = uid();
  const name = `User-${userId.slice(0, 4).toUpperCase()}`;
  const id = { userId, name };
  try {
    localStorage.setItem("zza-os:chat:identity", JSON.stringify(id));
  } catch {}
  return id;
}

function loadRoom() {
  try {
    return localStorage.getItem("zza-os:chat:room") || "lobby";
  } catch {
    return "lobby";
  }
}

function saveRoom(room: string) {
  try {
    localStorage.setItem("zza-os:chat:room", room);
  } catch {}
}

export function ChatSimulatorApp() {
  const ident = useMemo(() => loadIdentity(), []);
  const [room, setRoom] = useState(loadRoom);

  const [messages, setMessages] = useState<Msg[]>(() => {
    const seed: Msg[] = [
      {
        id: uid(),
        ts: now(),
        userId: "system",
        name: "SYSTEM",
        text: "Secure channel online. Type /help for commands.",
        kind: "system",
      },
      {
        id: uid(),
        ts: now(),
        userId: "n0va",
        name: "N0VA",
        text: "Ping me. I’ll reply with simulated responses.",
        kind: "user",
      },
    ];
    return seed;
  });

  const [draft, setDraft] = useState("");
  const [peerTyping, setPeerTyping] = useState<Typing[]>([]);
  const [botTyping, setBotTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const wsSendRef = useRef<(payload: unknown) => void>(() => {});
  const [wsState, setWsState] = useState<WsState>("idle");

  const channelName = useMemo(() => `zza-os-chat:${room}`, [room]);

  useEffect(() => {
    saveRoom(room);
  }, [room]);

  useEffect(() => {
    // setup BroadcastChannel for “people on the website” (same origin).
    const bc = new BroadcastChannel(channelName);
    bcRef.current = bc;

    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as
        | { type: "msg"; msg: Msg }
        | { type: "typing"; userId: string; name: string }
        | { type: "join"; userId: string; name: string };

      if (!data || typeof data !== "object") return;

      if (data.type === "msg") {
        const m = data.msg;
        // ignore our own echo
        if (m.userId === ident.userId) return;
        setMessages((s) => [...s, m]);
        return;
      }

      if (data.type === "typing") {
        if (data.userId === ident.userId) return;
        const until = now() + 1200;
        setPeerTyping((s) => {
          const next = s.filter((t) => t.userId !== data.userId);
          next.push({ userId: data.userId, name: data.name, until });
          return next;
        });
        return;
      }

      if (data.type === "join") {
        if (data.userId === ident.userId) return;
        setMessages((s) => [
          ...s,
          {
            id: uid(),
            ts: now(),
            userId: "system",
            name: "SYSTEM",
            text: `${data.name} joined #${room}`,
            kind: "system",
          },
        ]);
      }
    };

    bc.addEventListener("message", onMessage);

    // announce join
    bc.postMessage({ type: "join", userId: ident.userId, name: ident.name });

    return () => {
      bc.removeEventListener("message", onMessage);
      bc.close();
      bcRef.current = null;
    };
  }, [channelName, ident.name, ident.userId, room]);

  useEffect(() => {
    // WebSocket for multi-device chat (same LAN / same host).
    const conn = connectChatWs(
      (data) => {
        if (!isChatWireMsg(data)) return;
        if (data.type === "msg") {
          const m = data.msg as Msg;
          if (m.userId === ident.userId) return;
          setMessages((s) => [...s, m]);
          return;
        }
        if (data.type === "typing") {
          if (data.userId === ident.userId) return;
          const until = now() + 1200;
          setPeerTyping((s) => {
            const next = s.filter((t) => t.userId !== data.userId);
            next.push({ userId: data.userId, name: data.name, until });
            return next;
          });
          return;
        }
        if (data.type === "join") {
          if (data.userId === ident.userId) return;
          setMessages((s) => [
            ...s,
            {
              id: uid(),
              ts: now(),
              userId: "system",
              name: "SYSTEM",
              text: `${data.name} joined #${room}`,
              kind: "system",
            },
          ]);
        }
      },
      (s) => setWsState(s),
    );
    wsSendRef.current = (payload: unknown) => conn.send(payload);
    // join room
    conn.send({ type: "join", room, userId: ident.userId, name: ident.name });
    return () => conn.close();
  }, [ident.userId, ident.name, room]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = now();
      setPeerTyping((s) => s.filter((x) => x.until > t));
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, botTyping, peerTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendTyping = () => {
    bcRef.current?.postMessage({ type: "typing", userId: ident.userId, name: ident.name });
    wsSendRef.current?.({ type: "typing", room, userId: ident.userId, name: ident.name });
  };

  const appendMsg = (m: Msg) => setMessages((s) => [...s, m]);

  const classifyIntent = (t: string) => {
    const text = t.trim().toLowerCase();
    if (!text) return { kind: "empty" as const };
    if (/(^|\b)(help|commands|what can you do)\b/.test(text)) return { kind: "help" as const };
    if (/(^|\b)(theme|settings|blur|scale)\b/.test(text)) return { kind: "settings" as const };
    if (/(^|\b)(game|roblox|fortnite|valorant|minecraft|steam)\b/.test(text)) return { kind: "games" as const };
    if (/(^|\b)(calendar|schedule)\b/.test(text)) return { kind: "calendar" as const };
    if (/(^|\b)(record|mic|voice|recorder)\b/.test(text)) return { kind: "voice" as const };
    if (/(^|\b)(who are you|whoami|n0va)\b/.test(text)) return { kind: "identity" as const };
    if (/(^|\b)(status|system|uptime|cpu|ram)\b/.test(text)) return { kind: "system" as const };
    if (/(^|\b)(hello|hi|hey)\b/.test(text)) return { kind: "greet" as const };
    if (/(^|\b)(thanks|thx)\b/.test(text)) return { kind: "thanks" as const };
    return { kind: "smalltalk" as const };
  };

  const simulateBotReply = async (userText: string) => {
    // typing indicator + type-in animation
    const intent = classifyIntent(userText);
    const reply =
      intent.kind === "greet"
        ? "Hello. I’m N0VA. Tell me what you want to do: settings, games, calendar, voice."
        : intent.kind === "help"
          ? "Try: /help · /room lobby · /name <new>. Also: ask me about settings, calendar, voice recorder, or Game Hub."
          : intent.kind === "settings"
            ? "Settings tips: change Theme Presets for accent color, Blur for glass strength, and UI Scale for sizing."
            : intent.kind === "games"
              ? "Game Hub now opens official sites in a new tab. If your browser blocks popups, use the link shown in the launcher overlay."
              : intent.kind === "calendar"
                ? "Calendar is real now: month view + click a day + add events. It saves locally in your browser."
                : intent.kind === "voice"
                  ? "Voice Recorder uses your microphone. Hit Record → Stop, then pick a recording to play (saved locally)."
                  : intent.kind === "identity"
                    ? "I’m N0VA, a local simulated assistant inside ZZAAKKIIRRR OS. No internet access, but I can guide features."
                    : intent.kind === "system"
                      ? "System status: UI is client-side. For real device metrics, the browser can’t read full hardware details."
                      : intent.kind === "thanks"
                        ? "Acknowledged. Standing by."
                        : "Copy. I’m listening.";

    setBotTyping(true);
    await new Promise((r) => window.setTimeout(r, 650));
    setBotTyping(false);

    const id = uid();
    appendMsg({ id, ts: now(), userId: "n0va", name: "N0VA", text: "", kind: "user" });
    for (let i = 0; i < reply.length; i += 1) {
      await new Promise((r) => window.setTimeout(r, 12));
      const chunk = reply.slice(0, i + 1);
      setMessages((s) => s.map((m) => (m.id === id ? { ...m, text: chunk } : m)));
    }
  };

  const runCommand = (text: string) => {
    const parts = text.trim().split(/\s+/g);
    const cmd = (parts[0] || "").toLowerCase();
    if (cmd === "/help") {
      appendMsg({
        id: uid(),
        ts: now(),
        userId: "system",
        name: "SYSTEM",
        kind: "system",
        text:
          "Commands:\n" +
          "  /help            show this help\n" +
          "  /name <new>      change your name\n" +
          "  /room <id>       switch rooms (lobby, squad, etc)\n" +
          "Notes: realtime chat works for people on the same site (same origin).",
      });
      return true;
    }
    if (cmd === "/name") {
      const name = parts.slice(1).join(" ").trim();
      if (!name) return true;
      const next = { ...ident, name };
      try {
        localStorage.setItem("zza-os:chat:identity", JSON.stringify(next));
      } catch {}
      appendMsg({
        id: uid(),
        ts: now(),
        userId: "system",
        name: "SYSTEM",
        kind: "system",
        text: `Name set to ${name}`,
      });
      // force reload identity in this component by reloading page-like state:
      // simplest: just refresh the window (keeps it minimal)
      window.setTimeout(() => window.location.reload(), 350);
      return true;
    }
    if (cmd === "/room") {
      const r = parts[1]?.trim();
      if (!r) return true;
      setRoom(r);
      setMessages([
        {
          id: uid(),
          ts: now(),
          userId: "system",
          name: "SYSTEM",
          kind: "system",
          text: `Switched to #${r}.`,
        },
      ]);
      return true;
    }
    return false;
  };

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");

    if (text.startsWith("/")) {
      runCommand(text);
      return;
    }

    const msg: Msg = {
      id: uid(),
      ts: now(),
      userId: ident.userId,
      name: ident.name,
      text,
      kind: "user",
    };
    appendMsg(msg);
    bcRef.current?.postMessage({ type: "msg", msg });
    wsSendRef.current?.({ type: "msg", room, msg });

    // Simulated preset responses from N0VA (local-only bot).
    void simulateBotReply(text);
  };

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90" onMouseDown={() => inputRef.current?.focus()}>
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Chat</div>
        <div className="font-mono text-[11px] text-zinc-300/60">
          {ident.name} · #{room} · ws:{wsState}
        </div>
      </div>

      <div className="mt-3 h-[calc(100%-44px)] rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden flex flex-col">
        {/* header */}
        <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
          <div className="text-xs tracking-widest text-zinc-200/80">SECURE CHAT</div>
          <div className="text-[11px] font-mono text-emerald-300/70">ONLINE</div>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
          {messages.map((m) => (
            <MessageRow key={m.id} m={m} mine={m.userId === ident.userId} />
          ))}

          {(peerTyping.length > 0 || botTyping) && (
            <div className="text-[11px] font-mono text-zinc-300/60">
              {peerTyping.length > 0 && (
                <span>
                  {peerTyping.map((p) => p.name).join(", ")} typing
                </span>
              )}
              {peerTyping.length > 0 && botTyping ? <span> · </span> : null}
              {botTyping ? <span>N0VA typing</span> : null}
              <span className="animate-pulse">…</span>
            </div>
          )}
        </div>

        {/* composer */}
        <div className="p-3 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-2">
            <div className="hidden sm:block font-mono text-[11px] text-[rgb(var(--os-accent))]">
              &gt;
            </div>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                sendTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void send();
                  e.preventDefault();
                }
              }}
              className="flex-1 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[12px] font-mono outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-[rgba(var(--os-accent),0.35)]"
              placeholder="Message… (try /help)"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button
              type="button"
              onClick={() => void send()}
              className="rounded-2xl border border-white/10 bg-black/25 hover:bg-black/35 px-4 py-2 text-xs os-accent-shadow"
            >
              Send
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {[
              "hello",
              "status?",
              "show me the system portal",
              "midnight mode",
              "run scan",
            ].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setDraft(t);
                  inputRef.current?.focus();
                }}
                className="rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 px-3 py-1.5 text-[11px] font-mono text-zinc-200/80"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ m, mine }: { m: Msg; mine: boolean }) {
  if (m.kind === "system") {
    return (
      <div className="text-[11px] font-mono text-zinc-300/60 whitespace-pre-wrap">
        {m.text}
      </div>
    );
  }

  return (
    <div className={["flex", mine ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[80%] rounded-2xl border px-3 py-2",
          mine
            ? "border-[rgba(var(--os-accent),0.22)] bg-[rgba(var(--os-accent),0.10)]"
            : "border-white/10 bg-black/20",
        ].join(" ")}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[11px] font-mono text-zinc-200/70">{m.name}</div>
          <div className="text-[10px] font-mono text-zinc-300/40">
            {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className="mt-1 whitespace-pre-wrap break-words font-mono text-[12px] text-zinc-100/90">
          {m.text}
        </div>
      </div>
    </div>
  );
}


