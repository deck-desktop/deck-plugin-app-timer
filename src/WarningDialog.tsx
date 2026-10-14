import { AnimatePresence, motion } from "framer-motion";
import { type Job } from "./scheduler";
import { fmtClock } from "./timeFormat";

export function WarningDialog({
  job, verb, onCancel, onNow, onDismiss,
}: {
  job: Job | null;
  verb: string;            // "close 'slack'" | "Shutdown"
  onCancel: () => void;    // abort the job
  onNow: () => void;       // do it immediately
  onDismiss: () => void;   // just hide (job still fires on schedule)
}) {
  return (
    <AnimatePresence>
      {job && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            className="glass w-[380px] rounded-xl p-6"
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 6 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-text-primary">Heads up</h3>
            <p className="mt-2 text-sm text-text-secondary">
              About to <span className="font-medium text-text-primary">{verb}</span> at{" "}
              <span className="font-mono">{fmtClock(job.fireAt)}</span>.
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Cancel aborts it. Dismiss hides this — it still happens on schedule.
            </p>
            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                onClick={onDismiss}
                className="rounded-md px-3 py-2 text-sm text-text-muted transition hover:text-text-primary"
              >
                Dismiss
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  className="rounded-md border border-subtle bg-elev px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={onNow}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: "var(--danger)" }}
                >
                  Do it now
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
