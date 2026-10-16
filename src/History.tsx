import { useEffect, useState } from "react";
import { listen } from "../shim/event.js";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, X, Trash2 } from "lucide-react";
import { configRead, configWrite, type HistoryEntry } from "../shim/bridge.js";

// Fired timers, newest first, shared by both timer plugins and appended to by Deck's scheduler.
const HISTORY = "data/deck/history";
async function editHistory(edit: (all: HistoryEntry[]) => HistoryEntry[]) {
  const t = await configRead(HISTORY);
  let all: HistoryEntry[] = [];
  try { all = t.trim() ? JSON.parse(t) : []; } catch { return; } // unreadable: leave it, never overwrite
  await configWrite(HISTORY, JSON.stringify(edit(all), null, 2));
}
const historyDelete = (index: number) => editHistory((all) => all.filter((_, i) => i !== index));
const historyClear = (module: string) => editHistory((all) => all.filter((e) => e.module !== module));
import { fmtClock } from "./timeFormat";

/** Persistent fired-timer history for one module, with Repeat / delete / clear. */
export function History({
  module, describe, onRepeat, embedded,
}: {
  module: string;
  describe: (e: HistoryEntry) => string;
  onRepeat: (e: HistoryEntry) => void;
  embedded?: boolean;
}) {
  // Keep the global array index so a single-entry delete targets the right row.
  const [rows, setRows] = useState<{ entry: HistoryEntry; index: number }[]>([]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const load = () =>
      configRead(HISTORY).then((t) => {
        try {
          const all: HistoryEntry[] = t ? JSON.parse(t) : [];
          setRows(all.map((entry, index) => ({ entry, index })).filter((r) => r.entry.module === module));
        } catch { /* keep */ }
      }).catch((e) => console.warn("[app-timer] history load failed", e));
    load();
    listen<string[]>("config-changed", (e) => { if (e.payload.includes(HISTORY)) load(); }).then((u) => (unlisten = u));
    return () => unlisten?.();
  }, [module]);

  if (rows.length === 0) {
    return embedded ? (
      <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-subtle text-xs text-text-muted">
        Nothing yet
      </div>
    ) : null;
  }

  return (
    <div className={embedded ? "flex h-full flex-col" : "mt-5"}>
      <div className="mb-2 flex items-center justify-between">
        {!embedded && <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">History</h2>}
        <button
          onClick={() => historyClear(module)}
          className="ml-auto flex items-center gap-1 text-[11px] text-text-muted transition hover:text-danger"
          title="Clear all history"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {rows.map(({ entry: e, index }) => (
            <motion.div
              key={`${e.firedAt}-${index}`}
              layout
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="group flex items-center gap-2 rounded-lg border border-subtle bg-card px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-text-secondary">{describe(e)}</div>
                <div className="text-[11px] text-text-muted">{fmtClock(e.firedAt)}</div>
              </div>
              <button
                onClick={() => onRepeat(e)}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-text-muted transition hover:bg-elev hover:text-accent"
                title="Repeat"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => historyDelete(index)}
                className="rounded-md p-1.5 text-text-muted opacity-0 transition group-hover:opacity-100 hover:bg-elev hover:text-danger"
                title="Remove"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
