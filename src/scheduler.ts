// Deck — shared scheduling engine used by App Closer, Power Timer, and future
// time-based modules. Pure logic, no React. A single ticking clock drives all jobs.
//
// Design mirrors the PowerShell prototypes: window-open = timers run (in-memory).
// A later version can move firing to the Rust side to survive window close.

export type ScheduleMode = "delay" | "atTime";

export type Weekday =
  | "Monday" | "Tuesday" | "Wednesday" | "Thursday"
  | "Friday" | "Saturday" | "Sunday";

export const ALL_DAYS: Weekday[] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export interface Job {
  id: string;
  /** module that owns this job, e.g. "app-closer" | "power-timer" */
  module: string;
  /** human label for the list row, e.g. "slack" or "Shutdown" */
  label: string;
  mode: ScheduleMode;
  recurring: boolean;
  days: Weekday[];
  /** "HH:mm" for atTime mode */
  timeOfDay?: string;
  /** minutes, for delay mode — kept so "Repeat" can reuse the same delay */
  delayMin?: number;
  /** absolute epoch ms when the job fires */
  fireAt: number;
  warned: boolean;
  /** opaque payload the module needs at fire time (process name, action, …) */
  payload: unknown;
}

const WARN_LEAD_MS = 5 * 60 * 1000;

/** Parse "HH:mm" into {h,m}; throws on bad format. */
export function parseHHmm(s: string): { h: number; m: number } {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s.trim());
  if (!m) throw new Error(`Time '${s}' must be HH:mm (24h).`);
  return { h: Number(m[1]), m: Number(m[2]) };
}

/**
 * Next fire time (epoch ms) for a job spec, given `now`.
 * - delay: fireAt is already absolute, returned as-is.
 * - atTime one-time: today if still ahead, else tomorrow.
 * - atTime recurring: next day in `days` whose time is still ahead.
 * Returns null if recurring with no matching day found in a week.
 */
export function nextFire(
  spec: Pick<Job, "mode" | "recurring" | "days" | "timeOfDay" | "fireAt">,
  now: number,
): number | null {
  if (spec.mode === "delay") return spec.fireAt;

  const { h, m } = parseHHmm(spec.timeOfDay ?? "");
  const base = new Date(now);

  const at = (dayOffset: number) => {
    const d = new Date(base);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  };

  if (!spec.recurring) {
    const today = at(0);
    return (today.getTime() > now ? today : at(1)).getTime();
  }

  for (let i = 0; i < 8; i++) {
    const cand = at(i);
    if (cand.getTime() <= now) continue;
    const wd = ALL_DAYS[(cand.getDay() + 6) % 7]; // JS 0=Sun -> our Mon-first
    if (spec.days.includes(wd)) return cand.getTime();
  }
  return null;
}

export interface TickResult {
  /** jobs crossing into the 5-min warning window this tick (not yet warned) */
  toWarn: Job[];
  /** jobs whose fire time has arrived */
  toFire: Job[];
}

/** Classify jobs against `now`. Caller mutates `warned`/reschedules/removes. */
export function classify(jobs: Job[], now: number): TickResult {
  const toWarn: Job[] = [];
  const toFire: Job[] = [];
  for (const j of jobs) {
    if (now >= j.fireAt) { toFire.push(j); continue; }
    if (!j.warned && j.fireAt - now <= WARN_LEAD_MS) toWarn.push(j);
  }
  return { toWarn, toFire };
}

/**
 * Rebuild a schedule spec from a history entry so "Repeat" reuses the ORIGINAL
 * timing relative to now — a "close in 10 min" repeats as now+10min (not the old
 * absolute time), an at-time job re-targets its next occurrence.
 */
export function specFromHistory(e: {
  mode?: ScheduleMode; recurring?: boolean; days?: string[];
  timeOfDay?: string; delayMin?: number;
}): Pick<Job, "mode" | "recurring" | "days" | "timeOfDay" | "delayMin" | "fireAt"> {
  const now = Date.now();
  if (e.mode === "atTime" && e.timeOfDay) {
    const days = (e.days ?? []) as Weekday[];
    const fireAt = nextFire({ mode: "atTime", recurring: !!e.recurring, days, timeOfDay: e.timeOfDay, fireAt: 0 }, now);
    return { mode: "atTime", recurring: !!e.recurring, days, timeOfDay: e.timeOfDay, fireAt: fireAt ?? now };
  }
  // delay (default): reuse the same minutes from now; fall back to 30
  const min = e.delayMin && e.delayMin > 0 ? e.delayMin : 30;
  return { mode: "delay", recurring: false, days: [], delayMin: min, fireAt: now + min * 60_000 };
}

export function countdown(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(hh)}:${p(mm)}:${p(ss)}`;
}
