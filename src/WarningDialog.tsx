import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "../shim/react-dom.js";
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
  // Portalled, as Deck's ConfirmDialog is, so no transformed or clipped ancestor can trap it.
  return createPortal(
    <AnimatePresence>
      {job && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            className="w-[380px] overflow-hidden rounded-[12px] border border-subtle bg-card shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 6 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pb-4 pt-5">
              <h3 className="text-[15px] font-semibold text-text-primary">Heads up</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                About to <span className="font-medium text-text-primary">{verb}</span> at{" "}
                <span className="font-mono">{fmtClock(job.fireAt)}</span>.
              </p>
              <p className="mt-1 text-[11.5px] text-text-muted">
                Cancel aborts it. Dismiss hides this — it still happens on schedule.
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-subtle px-4 py-3">
              <button
                onClick={onDismiss}
                className="rounded-md px-3 py-1.5 text-[12.5px] text-text-muted transition-colors hover:bg-white/5 hover:text-text-primary"
              >
                Dismiss
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  className="rounded-md border border-subtle bg-elev px-3.5 py-1.5 text-[12.5px] text-text-secondary transition-colors hover:border-strong hover:text-text-primary"
                >
                  Cancel
                </button>
                {/* Red, as ConfirmDialog draws a confirm that cannot be taken back. */}
                <button
                  onClick={onNow}
                  className="rounded-md px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:brightness-110"
                  style={{ background: "var(--danger)" }}
                >
                  Do it now
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
