"use client";

import { useWindowStore } from "@/lib/os/windowStore";
import { WindowChrome } from "./WindowChrome";

export function WindowLayer() {
  const windows = useWindowStore((s) => s.windows);
  return (
    <div className="pointer-events-none absolute inset-0">
      {windows.map((w) => (
        <div key={w.id} className="pointer-events-none">
          <div className="pointer-events-auto">
            <WindowChrome win={w} />
          </div>
        </div>
      ))}
    </div>
  );
}

