import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "../shim/event.js";
import { type Job } from "./scheduler";
import { configRead, configWrite } from "../shim/bridge.js";

const newId = () => `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export interface PendingWarning {
  job: Job;
}

/**
 * Owns a module's in-memory job list, a 1s tick, and the warning-dialog state.
 * `onFire(job)` performs the actual effect (close app / power action). It runs
 * for one-time and recurring jobs alike; recurring jobs are rescheduled first.
 */
export function useScheduler(module: string) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [warning, setWarning] = useState<Job | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Last jobs JSON read-from / written-to disk. Persist only fires when jobs
  // actually differ — so a fresh mount (jobs=[]) before hydration completes
  // never overwrites the file, and loads don't echo back a write.
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Hydrate from the config file on mount, and reload when it changes on disk
  // (external editor or the MCP server rewriting it).
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const load = async () => {
      try {
        const txt = await configRead(module);
        const parsed = txt ? JSON.parse(txt) : { jobs: [] };
        const arr = Array.isArray(parsed.jobs) ? parsed.jobs : [];
        lastSynced.current = JSON.stringify(arr);
        setJobs(arr);
      } catch (e) { console.warn("[app-timer] jobs load failed", e); /* keep current */ }
    };
    load();
    listen<string[]>("config-changed", (e) => { if (e.payload.includes(module)) void load(); }).then((u) => (unlisten = u));
    return () => unlisten?.();
  }, [module]);

  // Persist only when jobs differ from what's on disk (and after first load).
  useEffect(() => {
    const cur = JSON.stringify(jobs);
    if (lastSynced.current === null || cur === lastSynced.current) return;
    lastSynced.current = cur;
    void configWrite(module, JSON.stringify({ jobs }, null, 2));
  }, [jobs, module]);

  // IDs whose warning the user dismissed — don't re-open them.
  const dismissed = useRef<Set<string>>(new Set());

  // Rust owns firing/warning now (see src-tauri scheduler). Here we only surface
  // the in-window warning dialog: if a job is flagged warned and still pending,
  // show it while the window is open. `now` drives the countdown re-render.
  useEffect(() => {
    if (warning) return;
    const w = jobs.find((j) => j.warned && j.fireAt > now && !dismissed.current.has(j.id));
    if (w) setWarning(w);
  }, [jobs, now, warning]);

  const add = useCallback((spec: Omit<Job, "id" | "warned" | "module">) => {
    const job: Job = { ...spec, id: newId(), warned: false, module };
    setJobs((p) => [...p, job]);
    return job;
  }, [module]);

  const remove = useCallback((id: string) => {
    setJobs((p) => p.filter((j) => j.id !== id));
    setWarning((w) => (w && w.id === id ? null : w));
  }, []);

  const cancelWarned = useCallback((id: string) => remove(id), [remove]);

  const fireNow = useCallback((id: string) => {
    setJobs((p) => p.map((j) => (j.id === id ? { ...j, fireAt: Date.now() } : j)));
    setWarning((w) => (w && w.id === id ? null : w));
  }, []);

  const dismissWarning = useCallback(() => {
    setWarning((w) => { if (w) dismissed.current.add(w.id); return null; });
  }, []);

  return { jobs, now, warning, add, remove, cancelWarned, fireNow, dismissWarning };
}
