"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { addPlaceholder, getGalleryBlob, listGallery, removeGalleryItem, type GalleryItem } from "@/lib/os/galleryDb";
import { useWindowStore } from "@/lib/os/windowStore";

// Module-level cache to avoid strict ref linting during render.
const galleryUrlCache = new Map<string, string>();

function placeholderSvg(label: string, hue: number) {
  const svg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="hsl(${hue} 95% 60%)" stop-opacity="0.55"/>
        <stop offset="0.65" stop-color="hsl(${(hue + 50) % 360} 95% 60%)" stop-opacity="0.25"/>
        <stop offset="1" stop-color="#060915" stop-opacity="0.92"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g fill="none" stroke="rgba(255,255,255,0.16)">
      <path d="M0,520 C160,380 260,460 420,360 C560,270 660,300 900,180" stroke-width="3"/>
      <path d="M0,420 C160,280 260,360 420,260 C560,170 660,200 900,80" stroke-width="2"/>
    </g>
    <g fill="rgba(255,255,255,0.85)" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">
      <text x="48" y="84" font-size="18" letter-spacing="4">ZZAAKKKIIRRR GALLERY</text>
      <text x="48" y="120" font-size="12" opacity="0.75">${label}</text>
    </g>
  </svg>`);
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

export function GalleryApp() {
  const openApp = useWindowStore((s) => s.openApp);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [zoomIn, setZoomIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const list = await listGallery();
    setItems(list);
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      // seed placeholders once
      const existing = await listGallery();
      if (existing.length === 0) {
        await addPlaceholder(placeholderSvg("Portal /home", 190), "Portal /home");
        await addPlaceholder(placeholderSvg("Neon skyline", 120), "Neon skyline");
        await addPlaceholder(placeholderSvg("Midnight drift", 260), "Midnight drift");
        await addPlaceholder(placeholderSvg("Core grid", 30), "Core grid");
      }
      await load();
    })();
    return () => {
      // revoke object urls
      for (const u of galleryUrlCache.values()) URL.revokeObjectURL(u);
      galleryUrlCache.clear();
    };
  }, []);

  const openItem = async (it: GalleryItem) => {
    setSelected(it);
    setZoomIn(false);
    const cached = galleryUrlCache.get(it.id);
    if (cached) {
      setSelectedUrl(cached);
      window.setTimeout(() => setZoomIn(true), 0);
      return;
    }
    const blob = await getGalleryBlob(it.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    galleryUrlCache.set(it.id, url);
    setSelectedUrl(url);
    window.setTimeout(() => setZoomIn(true), 0);
  };

  const grid = useMemo(() => items, [items]);

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Gallery</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openApp("camera")}
            className="rounded-xl border border-white/10 bg-black/25 hover:bg-black/35 px-3 py-2 text-xs os-accent-shadow"
          >
            Open Camera
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 px-3 py-2 text-xs"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-3 h-[calc(100%-44px)] rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
          <div className="text-xs tracking-widest text-zinc-200/80">
            IMAGES
          </div>
          <div className="text-[11px] font-mono text-zinc-300/60">
            {items.length} items
          </div>
        </div>

        <div className="p-4 overflow-auto h-[calc(100%-49px)]">
          {loading ? (
            <div className="text-zinc-300/60">Loading…</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {grid.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => void openItem(it)}
                  className="group rounded-2xl border border-white/10 bg-black/20 hover:bg-black/30 overflow-hidden text-left"
                >
                  <Thumb id={it.id} label={it.label} />
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="text-xs text-zinc-100/90 truncate">{it.label}</div>
                    <div className="text-[10px] font-mono text-zinc-300/50">{it.kind}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* modal */}
      {selected && selectedUrl && (
        <div
          className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onMouseDown={() => {
            setSelected(null);
            setSelectedUrl(null);
          }}
        >
          <div
            className={[
              "w-full max-w-4xl rounded-2xl border border-white/10 bg-black/25 os-liquid-edge overflow-hidden",
              "transition-transform duration-200 ease-out",
              zoomIn ? "scale-100 opacity-100" : "scale-[0.96] opacity-0",
            ].join(" ")}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-100">{selected.label}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void removeGalleryItem(selected.id).then(load)}
                  className="rounded-xl border border-rose-400/25 bg-black/20 hover:bg-black/30 px-3 py-2 text-xs text-rose-200"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setSelectedUrl(null);
                  }}
                  className="rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 px-3 py-2 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-3">
              <div className="relative w-full h-[60vh] rounded-2xl border border-white/10 overflow-hidden">
                <Image src={selectedUrl} alt={selected.label} fill unoptimized className="object-contain" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Thumb({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [url, setUrl] = useState<string | null>(() => galleryUrlCache.get(id) ?? null);

  useEffect(() => {
    let cancelled = false;
    if (url) return;
    void (async () => {
      const blob = await getGalleryBlob(id);
      if (!blob || cancelled) return;
      const u = URL.createObjectURL(blob);
      galleryUrlCache.set(id, u);
      setUrl(u);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, url]);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden">
      {url ? (
        <Image
          src={url}
          alt={label}
          fill
          unoptimized
          className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="h-full w-full bg-black/30" />
      )}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />
    </div>
  );
}
