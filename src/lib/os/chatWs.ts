export type ChatWireMsg =
  | { type: "join"; room: string; userId: string; name: string }
  | { type: "typing"; room: string; userId: string; name: string }
  | { type: "msg"; room: string; msg: unknown };

export type WsState = "idle" | "connecting" | "open" | "closed" | "error";

export function makeWsUrl() {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  const port = 3001;
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${host}:${port}`;
}

export function connectChatWs(
  onMessage: (m: unknown) => void,
  onState: (s: WsState) => void,
) {
  const url = makeWsUrl();
  if (!url) return { send: () => {}, close: () => {}, state: "idle" as WsState };

  let ws: WebSocket | null = null;
  let state: WsState = "connecting";
  onState(state);

  try {
    ws = new WebSocket(url);
  } catch {
    state = "error";
    onState(state);
    return { send: () => {}, close: () => {}, state };
  }

  ws.onopen = () => {
    state = "open";
    onState(state);
  };
  ws.onclose = () => {
    state = "closed";
    onState(state);
  };
  ws.onerror = () => {
    state = "error";
    onState(state);
  };
  ws.onmessage = (ev) => {
    try {
      onMessage(JSON.parse(ev.data));
    } catch {
      // ignore
    }
  };

  return {
    state,
    send: (payload: unknown) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify(payload));
    },
    close: () => {
      try {
        ws?.close();
      } catch {}
    },
  };
}

