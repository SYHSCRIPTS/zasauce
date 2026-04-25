import type { AppDefinition, AppId } from "./types";

export const APPS: AppDefinition[] = [
  { id: "terminal", title: "Terminal", iconText: ">_", defaultSize: { w: 680, h: 420 } },
  { id: "camera", title: "Camera", iconText: "▣", defaultSize: { w: 720, h: 620 } },
  { id: "camera-scan", title: "Camera Scan", iconText: "◉", defaultSize: { w: 640, h: 480 } },
  { id: "file-explorer", title: "File Explorer", iconText: "⌁", defaultSize: { w: 760, h: 520 } },
  { id: "browser", title: "Browser", iconText: "⟠", defaultSize: { w: 860, h: 560 } },
  { id: "settings", title: "Settings", iconText: "⚙", defaultSize: { w: 640, h: 520 } },
  { id: "system-monitor", title: "System Monitor", iconText: "▦", defaultSize: { w: 740, h: 520 } },
  { id: "music-player", title: "Music Player", iconText: "♪", defaultSize: { w: 640, h: 420 } },

  { id: "notes", title: "Notes", iconText: "✎", defaultSize: { w: 720, h: 520 } },
  { id: "gallery", title: "Gallery", iconText: "▥", defaultSize: { w: 820, h: 560 } },
  { id: "chat-simulator", title: "Chat Simulator", iconText: "☍", defaultSize: { w: 760, h: 540 } },
  { id: "calculator", title: "Calculator", iconText: "∑", defaultSize: { w: 420, h: 580 } },
  { id: "code-editor", title: "Code Editor", iconText: "</>", defaultSize: { w: 900, h: 600 } },
  { id: "map-viewer", title: "Map Viewer", iconText: "⌖", defaultSize: { w: 860, h: 560 } },
  { id: "weather-panel", title: "Weather", iconText: "⛅", defaultSize: { w: 520, h: 420 } },
  { id: "calendar", title: "Calendar", iconText: "▢", defaultSize: { w: 760, h: 540 } },
  { id: "game-hub", title: "Game Hub", iconText: "◈", defaultSize: { w: 900, h: 600 } },
  { id: "app-store", title: "App Store", iconText: "⬡", defaultSize: { w: 860, h: 560 } },
  { id: "voice-recorder", title: "Voice Recorder", iconText: "⟡", defaultSize: { w: 640, h: 420 } },
  { id: "image-editor", title: "Image Editor", iconText: "✦", defaultSize: { w: 920, h: 620 } },
  { id: "credits", title: "Credits", iconText: "©", defaultSize: { w: 560, h: 420 } },
];

export function getAppDefinition(appId: AppId): AppDefinition {
  const found = APPS.find((a) => a.id === appId);
  if (!found) throw new Error(`Unknown appId: ${appId}`);
  return found;
}

