import http from "http";
import next from "next";
import { WebSocketServer } from "ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const wsPort = Number(process.env.WS_PORT || 3001);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

// Next.js HTTP server (same as `next dev`, but custom so we can run WS too)
http
  .createServer((req, res) => handle(req, res))
  .listen(port, hostname, () => {
    console.log(`ZZAAKKKIIRRR OS web on http://localhost:${port}`);
  });

// Simple websocket hub for cross-device chat.
const wss = new WebSocketServer({ port: wsPort, host: hostname });

/** @type {Map<string, Set<any>>} */
const rooms = new Map();

function join(ws, room) {
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room).add(ws);
  ws.__room = room;
}

function leave(ws) {
  const room = ws.__room;
  if (!room) return;
  const set = rooms.get(room);
  if (set) {
    set.delete(ws);
    if (set.size === 0) rooms.delete(room);
  }
  ws.__room = null;
}

wss.on("connection", (ws) => {
  ws.__room = null;

  ws.on("message", (buf) => {
    let msg;
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      return;
    }

    if (msg?.type === "join" && typeof msg.room === "string") {
      leave(ws);
      join(ws, msg.room);
      return;
    }

    const room = ws.__room;
    if (!room) return;

    // broadcast to everyone else in room
    const peers = rooms.get(room);
    if (!peers) return;
    const out = JSON.stringify(msg);
    for (const peer of peers) {
      if (peer === ws) continue;
      if (peer.readyState === 1) peer.send(out);
    }
  });

  ws.on("close", () => leave(ws));
});

console.log(`ZZAAKKKIIRRR OS ws on ws://localhost:${wsPort}`);

