"use client";

import type { AppId } from "@/lib/os/types";
import { TerminalApp } from "./TerminalApp";
import { CameraApp } from "./CameraApp";
import { CameraScanApp } from "./CameraScanApp";
import { FileExplorerApp } from "./FileExplorerApp";
import { BrowserApp } from "./BrowserApp";
import { SettingsApp } from "./SettingsApp";
import { SystemMonitorApp } from "./SystemMonitorApp";
import { MusicPlayerApp } from "./MusicPlayerApp";
import { NotesApp } from "./NotesApp";
import { GalleryApp } from "./GalleryApp";
import { ChatSimulatorApp } from "./ChatSimulatorApp";
import { CalculatorApp } from "./CalculatorApp";
import { CodeEditorApp } from "./CodeEditorApp";
import { MapViewerApp } from "./MapViewerApp";
import { WeatherPanelApp } from "./WeatherPanelApp";
import { CalendarApp } from "./CalendarApp";
import { GameHubApp } from "./GameHubApp";
import { AppStoreApp } from "./AppStoreApp";
import { VoiceRecorderApp } from "./VoiceRecorderApp";
import { ImageEditorApp } from "./ImageEditorApp";
import { CreditsApp } from "./CreditsApp";

export function AppShell({ appId }: { appId: AppId }) {
  switch (appId) {
    case "terminal":
      return <TerminalApp />;
    case "camera":
      return <CameraApp />;
    case "camera-scan":
      return <CameraScanApp />;
    case "file-explorer":
      return <FileExplorerApp />;
    case "browser":
      return <BrowserApp />;
    case "settings":
      return <SettingsApp />;
    case "system-monitor":
      return <SystemMonitorApp />;
    case "music-player":
      return <MusicPlayerApp />;
    case "notes":
      return <NotesApp />;
    case "gallery":
      return <GalleryApp />;
    case "chat-simulator":
      return <ChatSimulatorApp />;
    case "calculator":
      return <CalculatorApp />;
    case "code-editor":
      return <CodeEditorApp />;
    case "map-viewer":
      return <MapViewerApp />;
    case "weather-panel":
      return <WeatherPanelApp />;
    case "calendar":
      return <CalendarApp />;
    case "game-hub":
      return <GameHubApp />;
    case "app-store":
      return <AppStoreApp />;
    case "voice-recorder":
      return <VoiceRecorderApp />;
    case "image-editor":
      return <ImageEditorApp />;
    case "credits":
      return <CreditsApp />;
  }
}

