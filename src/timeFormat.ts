// Clock formatting for this tab.
//
// Deck's own `src/core/timeFormat.ts` also carries the settings-backed hooks, which reach into
// its settings store — a whole subsystem this plugin would otherwise pull across the boundary
// for two pure functions. Deck displays 12-hour time everywhere (its `useTimeFormat()` is a
// literal `true`), so the flag those functions took is gone rather than threaded through.

/** Format an "HH:mm" (24h storage) string for display. */
export function fmtTime(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;
  const h = Number(m[1]);
  const ap = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${m[2]} ${ap}`;
}

/** Format an epoch-ms timestamp's clock time, with seconds. */
export function fmtClock(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  const ap = d.getHours() < 12 ? "AM" : "PM";
  const h = d.getHours() % 12 || 12;
  return `${h}:${p(d.getMinutes())}:${p(d.getSeconds())} ${ap}`;
}
