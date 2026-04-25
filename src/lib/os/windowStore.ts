import { create } from "zustand";
import type { AppId, WindowId, WindowInstance, WindowRect } from "./types";
import { getAppDefinition } from "./apps";

function uid(): string {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type WindowState = {
  windows: WindowInstance[];
  activeWindowId: WindowId | null;
  nextZ: number;

  openApp: (appId: AppId) => WindowId;
  closeWindow: (id: WindowId) => void;
  minimizeWindow: (id: WindowId) => void;
  toggleMaximize: (id: WindowId) => void;
  focusWindow: (id: WindowId) => void;
  restoreWindow: (id: WindowId) => void;
  setWindowRect: (id: WindowId, rect: Partial<WindowRect>) => void;
  setClosing: (id: WindowId, isClosing: boolean) => void;
};

export const useWindowStore = create<WindowState>((set, get) => ({
  windows: [],
  activeWindowId: null,
  nextZ: 10,

  openApp: (appId) => {
    const def = getAppDefinition(appId);
    const id = uid();

    // Spawn near top-left with slight offset per existing windows.
    const offset = get().windows.length * 24;
    const rect: WindowRect = {
      x: clamp(80 + offset, 20, 900),
      y: clamp(72 + offset, 20, 600),
      w: def.defaultSize.w,
      h: def.defaultSize.h,
    };

    const zIndex = get().nextZ;
    set((s) => ({
      windows: [
        ...s.windows,
        {
          id,
          appId,
          title: def.title,
          rect,
          isMinimized: false,
          isMaximized: false,
          zIndex,
          isClosing: false,
        },
      ],
      activeWindowId: id,
      nextZ: zIndex + 1,
    }));
    return id;
  },

  closeWindow: (id) => {
    set((s) => ({
      windows: s.windows.filter((w) => w.id !== id),
      activeWindowId: s.activeWindowId === id ? null : s.activeWindowId,
    }));
  },

  minimizeWindow: (id) => {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)),
      activeWindowId: s.activeWindowId === id ? null : s.activeWindowId,
    }));
  },

  restoreWindow: (id) => {
    get().focusWindow(id);
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, isMinimized: false } : w)),
    }));
  },

  toggleMaximize: (id) => {
    get().focusWindow(id);
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, isMaximized: !w.isMaximized, isMinimized: false } : w,
      ),
    }));
  },

  focusWindow: (id) => {
    const zIndex = get().nextZ;
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, zIndex, isMinimized: false } : w,
      ),
      activeWindowId: id,
      nextZ: zIndex + 1,
    }));
  },

  setWindowRect: (id, rect) => {
    // Clamp windows to viewport so they don’t get “lost” off-screen.
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 720;
    const taskbarSpace = 88;

    set((s) => ({
      windows: s.windows.map((w) => {
        if (w.id !== id) return w;
        const nextRect = { ...w.rect, ...rect };
        const maxX = Math.max(8, vw - nextRect.w - 8);
        const maxY = Math.max(8, vh - taskbarSpace - nextRect.h - 8);
        return {
          ...w,
          rect: {
            ...nextRect,
            x: clamp(nextRect.x, 8, maxX),
            y: clamp(nextRect.y, 8, maxY),
          },
        };
      }),
    }));
  },

  setClosing: (id, isClosing) => {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, isClosing } : w)),
    }));
  },
}));

