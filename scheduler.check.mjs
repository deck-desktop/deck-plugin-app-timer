// The scheduling logic, checked without a browser.
//
//   node scheduler.check.mjs
//
// What is worth pinning is `nextFire`: it decides when a job actually runs, and its two easy
// mistakes are silent. JS weekdays are Sunday-first while Deck's are Monday-first, so an
// off-by-one there fires a job on the wrong day; and "today at 18:00" has to mean tomorrow once
// 18:00 has passed, or a job set in the evening fires immediately.
//
// The real scheduler.ts is compiled and imported rather than copied in. The version of this file
// that this replaced held its own inline copy of nextFire "kept in sync by hand", which is a
// check that cannot fail for the one reason you want it to: the source changing underneath it.
//
// Times are parsed without a zone, so they are local — matching what the module does with a
// user's "18:00". The TZ is pinned so the expectations hold on any machine.
process.env.TZ = "Etc/GMT-3"; // POSIX sign convention: GMT-3 IS UTC+3
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

const dir = mkdtempSync(join(tmpdir(), "deck-sched-"));
const out = join(dir, "scheduler.mjs");
await build({
  entryPoints: [join(import.meta.dirname, "src/scheduler.ts")],
  outfile: out, format: "esm", bundle: false,
});
const { nextFire, parseHHmm, classify, countdown, ALL_DAYS } = await import(`file://${out}`);
rmSync(dir, { recursive: true, force: true });

const now = new Date("2026-08-16T14:00:00").getTime(); // a Sunday

// ---- nextFire: one-time -----------------------------------------------------------------------
assert.equal(
  nextFire({ mode: "atTime", recurring: false, timeOfDay: "18:00", days: [] }, now),
  new Date("2026-08-16T18:00:00").getTime(),
  "a time still ahead today fires today",
);
assert.equal(
  nextFire({ mode: "atTime", recurring: false, timeOfDay: "10:00", days: [] }, now),
  new Date("2026-08-17T10:00:00").getTime(),
  "a time already past fires tomorrow, not immediately",
);

// ---- nextFire: recurring ----------------------------------------------------------------------
// From Sunday, the next Mon/Wed/Fri job is Monday. This is the weekday-mapping check: JS counts
// Sunday as 0, Deck's ALL_DAYS starts at Monday, and getting that wrong lands a day off.
assert.equal(
  nextFire({ mode: "atTime", recurring: true, timeOfDay: "09:00", days: ["Monday", "Wednesday", "Friday"] }, now),
  new Date("2026-08-17T09:00:00").getTime(),
  "recurring skips to the next matching weekday",
);
// Today IS a matching day and the time is still ahead: it fires today rather than in a week.
assert.equal(
  nextFire({ mode: "atTime", recurring: true, timeOfDay: "18:00", days: ["Sunday"] }, now),
  new Date("2026-08-16T18:00:00").getTime(),
  "a matching day still ahead fires today",
);
// Today matches but the time has passed: the next one is a week away.
assert.equal(
  nextFire({ mode: "atTime", recurring: true, timeOfDay: "10:00", days: ["Sunday"] }, now),
  new Date("2026-08-23T10:00:00").getTime(),
  "a matching day already past fires next week",
);
// No days ticked can never fire — null, rather than a guessed date.
assert.equal(
  nextFire({ mode: "atTime", recurring: true, timeOfDay: "09:00", days: [] }, now),
  null,
  "a recurring job with no days has no next fire",
);
// A delay job's fireAt is already absolute and is returned untouched.
assert.equal(nextFire({ mode: "delay", recurring: false, days: [], fireAt: 12345 }, now), 12345);

// ---- parseHHmm --------------------------------------------------------------------------------
assert.deepEqual(parseHHmm("09:05"), { h: 9, m: 5 });
assert.deepEqual(parseHHmm("23:59"), { h: 23, m: 59 });
assert.throws(() => parseHHmm("24:00"), /24h/, "an out-of-range hour is rejected, not wrapped");
assert.throws(() => parseHHmm("9:60"), /24h/);
assert.throws(() => parseHHmm(""), /24h/);

// ---- classify: what the tick acts on ----------------------------------------------------------
const job = (o) => ({
  id: "j", module: "app-closer", label: "x", mode: "atTime", recurring: false,
  days: [], warned: false, payload: null, ...o,
});
const due = classify([job({ fireAt: now - 1 })], now);
assert.equal(due.toFire.length, 1, "a job whose time has come fires");
assert.equal(due.toWarn.length, 0);

// The warning lead is 5 minutes: inside it, a not-yet-warned job is warned but not fired.
const soon = classify([job({ fireAt: now + 4 * 60_000 })], now);
assert.equal(soon.toWarn.length, 1, "a job within the warning window is warned");
assert.equal(soon.toFire.length, 0, "warning is not firing");
// Already warned once — it must not be warned again every tick.
assert.equal(classify([job({ fireAt: now + 4 * 60_000, warned: true })], now).toWarn.length, 0);
// Outside the window, nothing happens at all.
const later = classify([job({ fireAt: now + 30 * 60_000 })], now);
assert.equal(later.toWarn.length + later.toFire.length, 0);

// ---- countdown --------------------------------------------------------------------------------
assert.equal(countdown(0), "00:00:00");
assert.equal(countdown(3_661_000), "01:01:01");
assert.equal(countdown(59_000), "00:00:59");
// The clamp matters: a job whose time has passed but has not been swept yet would otherwise
// render as a negative clock in the row.
assert.equal(countdown(-5000), "00:00:00", "a past job reads as zero, never negative");

assert.equal(ALL_DAYS.length, 7);
assert.equal(ALL_DAYS[0], "Monday", "Deck's week starts on Monday");

console.log("app timer: all checks passed");
