import { AnimatePresence, motion } from "framer-motion";
import { Timer, X } from "lucide-react";
import { type Job, countdown } from "./scheduler";

export function JobList({
  jobs, now, onRemove,
}: { jobs: Job[]; now: number; onRemove: (id: string) => void }) {
  if (jobs.length === 0) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-subtle bg-elev px-3 py-3 text-[12px] leading-relaxed text-text-muted">
        <Timer size={16} className="mt-0.5 shrink-0" />
        <span>No timers running. Pick when above and start one; it fires even with Deck closed.</span>
      </div>
    );
  }
  return (
    <motion.div
      className="flex flex-col"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.03 } } }}
    >
      <AnimatePresence initial={false}>
        {jobs.map((j) => {
          const rem = j.fireAt - now;
          const soon = rem <= 5 * 60 * 1000;
          return (
            <motion.div
              key={j.id}
              layout
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="group flex h-6 items-center gap-2 rounded-md px-2 text-[12.5px] text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
            >
              <span className="shrink-0 truncate text-text-primary">{j.label}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-text-muted">
                {j.recurring
                  ? "repeats " + j.days.map((d) => d.slice(0, 2)).join(", ")
                  : "one-time"}
                {j.warned && <span className="text-amber-400"> · warning shown</span>}
              </span>
              <span
                className="shrink-0 font-mono text-[12px] tabular-nums"
                style={{ color: soon ? "rgb(var(--tone-amber-400))" : "var(--text-primary)" }}
              >
                {countdown(rem)}
              </span>
              <button
                onClick={() => onRemove(j.id)}
                className="grid size-5 shrink-0 place-items-center rounded text-text-muted opacity-0 transition-colors hover:bg-white/10 hover:text-red-400 group-hover:opacity-100"
                title="Cancel"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
