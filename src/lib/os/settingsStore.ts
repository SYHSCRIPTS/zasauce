import { create } from "zustand";

export type ThemePreset = "neon-green" | "cyber-blue" | "red-alert";

export type OsSettings = {
  theme: ThemePreset;
  scanOverlayIntensity: number; // 0..1
  soundEffects: boolean;
  blurStrength: number; // 6..28
  uiScale: number; // 0.85..1.15
};

const DEFAULTS: OsSettings = {
  theme: "cyber-blue",
  scanOverlayIntensity: 0.75,
  soundEffects: true,
  blurStrength: 18,
  uiScale: 1,
};

function load(): OsSettings {
  try {
    const raw = localStorage.getItem("zza-os:settings");
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<OsSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function save(s: OsSettings) {
  try {
    localStorage.setItem("zza-os:settings", JSON.stringify(s));
  } catch {
    // ignore
  }
}

function applyToCssVars(s: OsSettings) {
  const root = document.documentElement;
  root.style.setProperty("--os-blur", `${s.blurStrength}px`);
  root.style.setProperty("--os-scale", `${s.uiScale}`);
  root.style.setProperty("--scan-intensity", `${s.scanOverlayIntensity}`);

  // Theme palette for the entire OS (background + glass + accents)
  if (s.theme === "neon-green") {
    root.style.setProperty("--os-accent", "34 197 94"); // emerald-500
    root.style.setProperty("--os-accent2", "16 185 129"); // emerald-600
    root.style.setProperty("--background", "#eefbf3");
    root.style.setProperty("--foreground", "#052e1a");
    root.style.setProperty("--glass", "rgba(255, 255, 255, 0.22)");
    root.style.setProperty("--glass-strong", "rgba(255, 255, 255, 0.34)");
    root.style.setProperty("--glass-border", "rgba(255, 255, 255, 0.62)");
    root.style.setProperty("--shadow-glass", "0 18px 56px rgba(5, 46, 26, 0.12)");
    root.style.setProperty("--os-bg1", "34 197 94");
    root.style.setProperty("--os-bg2", "16 185 129");
    root.style.setProperty("--os-bg3", "20 184 166");
    root.style.setProperty("--os-bg-base1", "#eefbf3");
    root.style.setProperty("--os-bg-base2", "#e7f7ee");
  } else if (s.theme === "red-alert") {
    root.style.setProperty("--os-accent", "244 63 94"); // rose-500
    root.style.setProperty("--os-accent2", "239 68 68"); // red-500
    root.style.setProperty("--background", "#fff1f4");
    root.style.setProperty("--foreground", "#4c0519");
    root.style.setProperty("--glass", "rgba(255, 255, 255, 0.20)");
    root.style.setProperty("--glass-strong", "rgba(255, 255, 255, 0.32)");
    root.style.setProperty("--glass-border", "rgba(255, 255, 255, 0.62)");
    root.style.setProperty("--shadow-glass", "0 18px 56px rgba(76, 5, 25, 0.12)");
    root.style.setProperty("--os-bg1", "244 63 94");
    root.style.setProperty("--os-bg2", "239 68 68");
    root.style.setProperty("--os-bg3", "249 115 22");
    root.style.setProperty("--os-bg-base1", "#fff1f4");
    root.style.setProperty("--os-bg-base2", "#ffe7ee");
  } else {
    root.style.setProperty("--os-accent", "56 189 248"); // sky-400
    root.style.setProperty("--os-accent2", "168 85 247"); // purple-500
    // Default theme: slightly darker "midnight glass"
    root.style.setProperty("--background", "#0b1220");
    root.style.setProperty("--foreground", "#e6edf7");
    root.style.setProperty("--glass", "rgba(15, 23, 42, 0.38)");
    root.style.setProperty("--glass-strong", "rgba(15, 23, 42, 0.52)");
    root.style.setProperty("--glass-border", "rgba(255, 255, 255, 0.14)");
    root.style.setProperty("--shadow-glass", "0 18px 56px rgba(0, 0, 0, 0.45)");
    root.style.setProperty("--os-bg1", "56 189 248");
    root.style.setProperty("--os-bg2", "168 85 247");
    root.style.setProperty("--os-bg3", "20 184 166");
    root.style.setProperty("--os-bg-base1", "#0b1220");
    root.style.setProperty("--os-bg-base2", "#0a1628");
  }
}

type SettingsState = {
  settings: OsSettings;
  setTheme: (t: ThemePreset) => void;
  setScanOverlayIntensity: (v: number) => void;
  setSoundEffects: (v: boolean) => void;
  setBlurStrength: (v: number) => void;
  setUiScale: (v: number) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULTS,

  setTheme: (theme) => {
    set((st) => {
      const next = { ...st.settings, theme };
      save(next);
      applyToCssVars(next);
      return { settings: next };
    });
  },
  setScanOverlayIntensity: (scanOverlayIntensity) => {
    set((st) => {
      const next = { ...st.settings, scanOverlayIntensity };
      save(next);
      applyToCssVars(next);
      return { settings: next };
    });
  },
  setSoundEffects: (soundEffects) => {
    set((st) => {
      const next = { ...st.settings, soundEffects };
      save(next);
      applyToCssVars(next);
      return { settings: next };
    });
  },
  setBlurStrength: (blurStrength) => {
    set((st) => {
      const next = { ...st.settings, blurStrength };
      save(next);
      applyToCssVars(next);
      return { settings: next };
    });
  },
  setUiScale: (uiScale) => {
    set((st) => {
      const next = { ...st.settings, uiScale };
      save(next);
      applyToCssVars(next);
      return { settings: next };
    });
  },
}));

export function bootstrapSettings() {
  const s = load();
  applyToCssVars(s);
  // initialize store
  useSettingsStore.setState({ settings: s });
}

