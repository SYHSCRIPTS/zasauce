"use client";

import { useEffect, useMemo, useState } from "react";

type CalEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  createdAt: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(year: number, month0: number) {
  return new Date(year, month0, 1, 12, 0, 0, 0);
}

function daysInMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0, 12, 0, 0, 0).getDate();
}

function uid() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

function loadEvents(): CalEvent[] {
  try {
    const raw = localStorage.getItem("zza-os:calendar:events");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CalEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => typeof e?.id === "string" && typeof e?.date === "string" && typeof e?.title === "string");
  } catch {
    return [];
  }
}

function saveEvents(events: CalEvent[]) {
  try {
    localStorage.setItem("zza-os:calendar:events", JSON.stringify(events));
  } catch {
    // ignore
  }
}

export function CalendarApp() {
  const today = useMemo(() => new Date(), []);
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM0, setViewM0] = useState(today.getMonth());
  const [selected, setSelected] = useState<string>(() => ymd(new Date()));
  const [events, setEvents] = useState<CalEvent[]>(() => (typeof window === "undefined" ? [] : loadEvents()));
  const [draft, setDraft] = useState("");

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  const monthLabel = useMemo(() => {
    const d = new Date(viewY, viewM0, 1, 12, 0, 0, 0);
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }, [viewM0, viewY]);

  const grid = useMemo(() => {
    const first = startOfMonth(viewY, viewM0);
    const firstDow = (first.getDay() + 6) % 7; // Monday=0
    const dim = daysInMonth(viewY, viewM0);
    const cells: { date: string; inMonth: boolean; day: number }[] = [];

    // prev month tail
    const prevDim = daysInMonth(viewY, viewM0 - 1);
    for (let i = 0; i < firstDow; i += 1) {
      const day = prevDim - (firstDow - 1 - i);
      const d = new Date(viewY, viewM0 - 1, day, 12, 0, 0, 0);
      cells.push({ date: ymd(d), inMonth: false, day });
    }
    // this month
    for (let day = 1; day <= dim; day += 1) {
      const d = new Date(viewY, viewM0, day, 12, 0, 0, 0);
      cells.push({ date: ymd(d), inMonth: true, day });
    }
    // next month head (fill to 6 weeks)
    while (cells.length < 42) {
      const idx = cells.length - (firstDow + dim);
      const day = idx + 1;
      const d = new Date(viewY, viewM0 + 1, day, 12, 0, 0, 0);
      cells.push({ date: ymd(d), inMonth: false, day });
    }
    return cells;
  }, [viewM0, viewY]);

  const eventsForSelected = useMemo(() => events.filter((e) => e.date === selected), [events, selected]);
  const hasEvents = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) map.set(e.date, (map.get(e.date) ?? 0) + 1);
    return map;
  }, [events]);

  const goPrev = () => {
    const d = new Date(viewY, viewM0 - 1, 1, 12, 0, 0, 0);
    setViewY(d.getFullYear());
    setViewM0(d.getMonth());
  };
  const goNext = () => {
    const d = new Date(viewY, viewM0 + 1, 1, 12, 0, 0, 0);
    setViewY(d.getFullYear());
    setViewM0(d.getMonth());
  };
  const goToday = () => {
    const d = new Date();
    setViewY(d.getFullYear());
    setViewM0(d.getMonth());
    setSelected(ymd(d));
  };

  const addEvent = () => {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    setEvents((s) => [{ id: uid(), date: selected, title, createdAt: Date.now() }, ...s].slice(0, 500));
  };

  const removeEvent = (id: string) => setEvents((s) => s.filter((e) => e.id !== id));

  return (
    <div className="h-full w-full p-4 text-sm text-zinc-100/90">
      <div className="flex items-center justify-between">
        <div className="os-glow-text font-semibold text-zinc-100">Calendar</div>
        <div className="text-[11px] font-mono text-zinc-300/60">{monthLabel}</div>
      </div>

      <div className="mt-3 grid grid-cols-12 gap-3 h-[calc(100%-44px)] min-h-0">
        <div className="col-span-8 rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden min-h-0 flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
            <div className="text-xs tracking-widest text-zinc-200/80">MONTH VIEW</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="h-8 px-3 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-[11px] font-mono"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={goToday}
                className="h-8 px-3 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-[11px] font-mono"
              >
                TODAY
              </button>
              <button
                type="button"
                onClick={goNext}
                className="h-8 px-3 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-[11px] font-mono"
              >
                ▶
              </button>
            </div>
          </div>

          <div className="p-3 min-h-0">
            <div className="grid grid-cols-7 gap-2 text-[11px] font-mono text-zinc-300/70 px-1">
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
                <div key={d} className="text-center">
                  {d}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {grid.map((c) => {
                const isToday = c.date === ymd(new Date());
                const isSel = c.date === selected;
                const cnt = hasEvents.get(c.date) ?? 0;
                return (
                  <button
                    key={c.date}
                    type="button"
                    onClick={() => setSelected(c.date)}
                    className={[
                      "relative rounded-2xl border text-left p-2 h-[68px] transition-colors overflow-hidden",
                      "bg-black/20 hover:bg-black/30",
                      c.inMonth ? "border-white/10" : "border-white/5 opacity-70",
                      isSel ? "ring-2 ring-[rgba(var(--os-accent),0.55)] border-white/20" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div className={["text-xs font-mono", c.inMonth ? "text-zinc-100/90" : "text-zinc-300/60"].join(" ")}>
                        {c.day}
                      </div>
                      {isToday && (
                        <div className="h-2 w-2 rounded-full bg-[rgb(var(--os-accent))] shadow-[0_0_18px_rgba(var(--os-accent),0.25)]" />
                      )}
                    </div>
                    {cnt > 0 && (
                      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                        <div className="h-1 flex-1 rounded-full bg-[rgba(var(--os-accent),0.35)]" />
                        <div className="text-[10px] font-mono text-zinc-300/70">{cnt}</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-4 rounded-2xl border border-white/10 bg-black/20 os-liquid-edge overflow-hidden min-h-0 flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
            <div className="text-xs tracking-widest text-zinc-200/80">DAY</div>
            <div className="text-[11px] font-mono text-[rgb(var(--os-accent))]">{selected}</div>
          </div>

          <div className="p-4 min-h-0 overflow-auto">
            <div className="text-[11px] font-mono text-zinc-300/60">EVENTS</div>
            <div className="mt-2 space-y-2">
              {eventsForSelected.length === 0 ? (
                <div className="text-sm text-zinc-200/70">No events for this day.</div>
              ) : (
                eventsForSelected.map((e) => (
                  <div key={e.id} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm text-zinc-100/90 break-words">{e.title}</div>
                      <button
                        type="button"
                        onClick={() => removeEvent(e.id)}
                        className="shrink-0 h-7 w-8 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-[11px] font-mono text-zinc-200/70"
                        title="Delete"
                        aria-label="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4">
              <div className="text-[11px] font-mono text-zinc-300/60">ADD</div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addEvent();
                  }}
                  placeholder="Event title…"
                  className="h-10 flex-1 rounded-2xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-white/20"
                />
                <button
                  type="button"
                  onClick={addEvent}
                  className="h-10 px-4 rounded-2xl border border-white/10 bg-[rgba(var(--os-accent),0.16)] hover:bg-[rgba(var(--os-accent),0.22)] text-sm font-semibold"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 text-[11px] text-zinc-300/60">Saved locally in this browser.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

