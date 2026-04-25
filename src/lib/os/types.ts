export type AppId =
  | "terminal"
  | "camera"
  | "camera-scan"
  | "file-explorer"
  | "browser"
  | "settings"
  | "system-monitor"
  | "music-player"
  | "notes"
  | "gallery"
  | "chat-simulator"
  | "calculator"
  | "code-editor"
  | "map-viewer"
  | "weather-panel"
  | "calendar"
  | "game-hub"
  | "app-store"
  | "voice-recorder"
  | "image-editor"
  | "credits";

export type WindowId = string;

export type WindowRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type AppDefinition = {
  id: AppId;
  title: string;
  iconText: string;
  defaultSize: { w: number; h: number };
};

export type WindowInstance = {
  id: WindowId;
  appId: AppId;
  title: string;
  rect: WindowRect;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  isClosing: boolean;
};

