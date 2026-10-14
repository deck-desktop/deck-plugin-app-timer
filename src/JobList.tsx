import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { type Job, countdown } from "./scheduler";

export function JobList({
  jobs, now, onRemove,
}: { jobs: Job[]; now: number; onRemove: (id: string) => void }) {
  if (jobs.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-muted">No active timers.</p>
    );
  }
  return (
    <motion.div
      className="flex flex-col gap-2"
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
              className="group flex items-center gap-3 rounded-lg border border-subtle bg-card px-4 py-3"
            >
              {/* accent bar */}
              <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
              <div className="flex-1">
                <div className="text-sm font-medium text-text-primary">{j.label}</div>
                <div className="text-[11px] text-text-muted">
                  {j.recurring
                    ? "repeats " + j.days.map((d) => d.slice(0, 2)).join(", ")
                    : "one-time"}
                  {j.warned && <span style={{ color: "var(--warn)" }}> · warning shown</span>}
                </div>
              </div>
              <div
                className="font-mono text-lg tabular-nums"
                style={{ color: soon ? "var(--warn)" : "var(--text-primary)" }}
              >
                {countdown(rem)}
              </div>
              <button
                onClick={() => onRemove(j.id)}
                className="rounded-md p-1.5 text-text-muted opacity-0 transition group-hover:opacity-100 hover:bg-elev hover:text-danger"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
