import { useState, type ReactNode } from "react";
import { Field, TimeInput, Segmented, DayPicker, PrimaryButton } from "../shim/ui.js";
import { type Job, type ScheduleMode, type Weekday, nextFire, parseHHmm } from "./scheduler";

export interface ScheduleValue {
  mode: ScheduleMode;
  recurring: boolean;
  days: Weekday[];
  timeOfDay: string;
  fireAt: number;
}

/**
 * The shared when-to-fire editor. `extraField` lets a module inject its own
 * control (app picker / action select) above the schedule. `onSubmit` gets a
 * ready job spec (minus id/warned/module) or the form blocks with an error.
 */
export function ScheduleForm({
  extraField, buttonLabel, onSubmit, allowRecurring = true,
}: {
  extraField: ReactNode;
  buttonLabel: string;
  onSubmit: (spec: Pick<Job, "mode" | "recurring" | "days" | "timeOfDay" | "delayMin" | "fireAt">) => string | null;
  allowRecurring?: boolean;
}) {
  const [mode, setMode] = useState<ScheduleMode>("delay");
  const [minutes, setMinutes] = useState("30");
  const [time, setTime] = useState("18:00");
  const [recurring, setRecurring] = useState(false);
  const [days, setDays] = useState<Weekday[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    let fireAt: number;
    let delayMin: number | undefined;
    if (mode === "delay") {
      const n = Number(minutes);
      if (!Number.isFinite(n) || n <= 0) return setError("Minutes must be a positive number.");
      if (recurring) return setError('Recurring needs "At time" mode, not N-minutes.');
      delayMin = n;
      fireAt = Date.now() + n * 60_000;
    } else {
      try { parseHHmm(time); } catch (e) { return setError(String((e as Error).message)); }
      if (recurring && days.length === 0) return setError("Recurring: select at least one day.");
      const nf = nextFire({ mode, recurring, days, timeOfDay: time, fireAt: 0 }, Date.now());
      if (nf == null) return setError("Could not compute a next fire time.");
      fireAt = nf;
    }
    const err = onSubmit({ mode, recurring, days, timeOfDay: mode === "atTime" ? time : undefined as any, delayMin, fireAt });
    if (err) setError(err);
  };

  return (
    <div className="flex flex-col gap-3.5">
      {extraField}

      <Field label="When">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            value={mode}
            onChange={(m) => { setMode(m as ScheduleMode); if (m === "delay") setRecurring(false); }}
            options={[{ value: "delay", label: "In N min" }, { value: "atTime", label: "At time" }]}
          />
          <div className="w-32">
            {mode === "delay" ? (
              <div className="relative">
                <input
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  inputMode="numeric"
                  className="h-9 w-full rounded-md border border-strong bg-elev pl-3 pr-12 text-sm text-text-primary outline-none transition focus:border-accent focus:shadow-glow"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">min</span>
              </div>
            ) : (
              <TimeInput value={time} onChange={setTime} className="w-full" />
            )}
          </div>
          {/* Submit sits to the right of the When fields. */}
          <PrimaryButton onClick={submit} className="ml-auto">{buttonLabel}</PrimaryButton>
        </div>
      </Field>

      {allowRecurring && mode === "atTime" && (
        <>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Recurring (repeat on selected days)
          </label>
          {recurring && <DayPicker value={days} onChange={(d) => setDays(d as Weekday[])} />}
        </>
      )}

      {error && <span className="text-xs" style={{ color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}
