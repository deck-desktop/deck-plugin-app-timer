import { useEffect, useState } from "react";
import { listen } from "../shim/event.js";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, X, Trash2, History as HistoryIcon } from "lucide-react";
import { configRead, configWrite, type HistoryEntry } from "../shim/bridge.js";
import { ConfirmDialog, type ConfirmState } from "../shim/ui.js";

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
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

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
      <div className="flex items-start gap-2.5 rounded-lg border border-subtle bg-elev px-3 py-3 text-[12px] leading-relaxed text-text-muted">
        <HistoryIcon size={16} className="mt-0.5 shrink-0" />
        <span>Nothing has fired yet. Each timer lands here when it fires, with Repeat to set it again.</span>
      </div>
    ) : null;
  }

  return (
    <div className={embedded ? "flex h-full flex-col" : "mt-5"}>
      <div className="mb-1 flex h-7 items-center px-2">
        {!embedded && <h2 className="text-[12px] font-medium text-text-secondary">History</h2>}
        <button
          onClick={() => setConfirm({
            title: "Clear the timer history?",
            body: "Every timer this tab has fired goes from the list. Timers still waiting to fire stay, and so does the other timer plugin's history.",
            confirmLabel: "Clear",
            onConfirm: () => void historyClear(module),
          })}
          className="ml-auto flex h-6 items-center gap-1 rounded-md px-1.5 text-[11.5px] text-text-muted transition-colors hover:bg-white/5 hover:text-red-400"
          title="Clear all history"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>
      <div className="flex flex-col">
        <AnimatePresence initial={false}>
          {rows.map(({ entry: e, index }) => (
            <motion.div
              key={`${e.firedAt}-${index}`}
              layout
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="group flex h-6 items-center gap-2 rounded-md px-2 text-[12.5px] text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
            >
              <span className="min-w-0 flex-1 truncate">{describe(e)}</span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-muted">{fmtClock(e.firedAt)}</span>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => onRepeat(e)}
                  className="grid size-5 place-items-center rounded text-text-muted transition-colors hover:bg-white/10 hover:text-text-primary"
                  title="Repeat"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={() => historyDelete(index)}
                  className="grid size-5 place-items-center rounded text-text-muted transition-colors hover:bg-white/10 hover:text-red-400"
                  title="Remove"
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
