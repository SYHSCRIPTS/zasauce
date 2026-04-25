"use client";

import Image from "next/image";

export function CreditsApp() {
  return (
    <div className="h-full w-full p-4 text-sm text-slate-900/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-slate-900">Credits</div>
        <div className="text-[11px] font-mono text-slate-600/70">ZZAAKKKIIRRR OS</div>
      </div>

      <div className="mt-3 h-[calc(100%-44px)] min-h-0 rounded-2xl border border-white/55 bg-white/15 os-liquid-edge overflow-hidden">
        <div className="p-4 grid grid-cols-12 gap-4 h-full min-h-0">
          <div className="col-span-5">
            <div className="relative aspect-square w-full max-w-[260px] rounded-2xl overflow-hidden border border-white/60 bg-white/25 shadow-[0_18px_56px_rgba(15,23,42,0.12)]">
              <Image src="/os-logo.jpg" alt="OS logo" fill className="object-cover" />
            </div>
            <div className="mt-3 text-[11px] text-slate-600/70">Logo</div>
          </div>

          <div className="col-span-7 min-h-0 flex flex-col">
            <div className="rounded-2xl border border-white/55 bg-white/20 p-4">
              <div className="text-xs tracking-widest text-slate-700/80">CREDITS</div>
              <div className="mt-3 space-y-2 text-[14px] text-slate-900/90">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">zaakir</div>
                  <div className="text-slate-700/80">developer</div>
                </div>
                <div className="h-px bg-white/50" />
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">zaakir</div>
                  <div className="text-slate-700/80">designer</div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-600/70">
              Thanks for using ZZAAKKKIIRRR OS.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

