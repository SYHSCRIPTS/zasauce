"use client";

import type { AppId } from "@/lib/os/types";
import { getAppDefinition } from "@/lib/os/apps";

export function PlaceholderApp({ appId }: { appId: AppId }) {
  const def = getAppDefinition(appId);
  return (
    <div className="h-full w-full p-4 text-sm text-zinc-200">
      <div className="os-glow-text text-zinc-100 font-semibold tracking-wide">
        {def.title}
      </div>
      <div className="mt-2 text-zinc-400">
        App shell ready. (Empty for now.)
      </div>
    </div>
  );
}

