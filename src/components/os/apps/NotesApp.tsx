"use client";

import { useEffect, useMemo, useState } from "react";

type Note = { id: string; title: string; body: string; updatedAt: number };

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function NotesApp() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const raw = localStorage.getItem("zza-os:notes");
    if (!raw) {
      return [
        {
          id: uid(),
          title: "Welcome",
          body: "Your notes live in this browser.",
          updatedAt: Date.now(),
        },
      ];
    }
    try {
      return JSON.parse(raw) as Note[];
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState<string | null>(() => notes[0]?.id ?? null);

  useEffect(() => {
    localStorage.setItem("zza-os:notes", JSON.stringify(notes));
  }, [notes]);

  const active = useMemo(() => notes.find((n) => n.id === activeId) ?? null, [notes, activeId]);

  const createNote = () => {
    const n: Note = { id: uid(), title: "Untitled", body: "", updatedAt: Date.now() };
    setNotes((s) => [n, ...s]);
    setActiveId(n.id);
  };

  const deleteNote = (id: string) => {
    setNotes((s) => s.filter((n) => n.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  };

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Notes</div>
        <button
          type="button"
          onClick={createNote}
          className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs hover:bg-black/35 os-accent-shadow"
        >
          New
        </button>
      </div>

      <div className="mt-3 grid grid-cols-12 gap-3 h-[calc(100%-52px)]">
        <div className="col-span-4 rounded-2xl border border-white/10 bg-black/20 os-liquid-edge p-2 overflow-auto">
          {notes.length === 0 ? (
            <div className="p-3 text-zinc-300/60">No notes yet.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {notes
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((n) => {
                  const isActive = n.id === activeId;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setActiveId(n.id)}
                      className={[
                        "text-left rounded-xl px-3 py-2 border",
                        isActive
                          ? "border-white/20 bg-black/35 shadow-[0_18px_40px_rgba(var(--os-accent),0.12)]"
                          : "border-white/10 bg-black/20 hover:bg-black/30",
                      ].join(" ")}
                    >
                      <div className="text-xs font-semibold text-zinc-100 truncate">
                        {n.title || "Untitled"}
                      </div>
                      <div className="text-[11px] text-zinc-300/60 truncate">{n.body || "…"}</div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        <div className="col-span-8 rounded-2xl border border-white/10 bg-black/20 os-liquid-edge p-3 flex flex-col gap-2">
          {!active ? (
            <div className="text-zinc-300/60">Select a note to edit.</div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <input
                  value={active.title}
                  onChange={(e) =>
                    setNotes((s) =>
                      s.map((n) => (n.id === active.id ? { ...n, title: e.target.value, updatedAt: Date.now() } : n)),
                    )
                  }
                  className="flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(var(--os-accent),0.35)]"
                  placeholder="Title"
                />
                <button
                  type="button"
                  onClick={() => deleteNote(active.id)}
                  className="rounded-xl border border-rose-400/25 bg-black/20 px-3 py-2 text-xs text-rose-200 hover:bg-black/30"
                >
                  Delete
                </button>
              </div>
              <textarea
                value={active.body}
                onChange={(e) =>
                  setNotes((s) =>
                    s.map((n) => (n.id === active.id ? { ...n, body: e.target.value, updatedAt: Date.now() } : n)),
                  )
                }
                className="flex-1 resize-none rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(var(--os-accent),0.35)]"
                placeholder="Write something…"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

