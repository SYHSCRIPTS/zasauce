"use client";

import { useEffect } from "react";
import { bootstrapSettings } from "@/lib/os/settingsStore";

export function SettingsBootstrapper() {
  useEffect(() => {
    bootstrapSettings();
  }, []);
  return null;
}

