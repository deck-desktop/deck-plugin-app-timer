import { useEffect, useState } from "react";
import { useScheduler } from "./useScheduler";
import { listApps, listInstalled, pickExe, type AppProc, type HistoryEntry } from "../shim/bridge.js";
import { specFromHistory } from "./scheduler";
import { Field, Segmented, Tabs } from "../shim/ui.js";
import { AppCombo } from "./AppCombo";
import { ScheduleForm } from "./ScheduleForm";
import { JobList } from "./JobList";
import { WarningDialog } from "./WarningDialog";
import { History } from "./History";
import { FolderOpen } from "lucide-react";

type AppAction = "close" | "open";

export default function AppTimer() {
  const [apps, setApps] = useState<AppProc[]>([]);
  const [action, setAction] = useState<AppAction>("close");
  const [target, setTarget] = useState("");
  const [tab, setTab] = useState<"active" | "history">("active");

  const sched = useScheduler("app-closer");

  const [installed, setInstalled] = useState<AppProc[]>([]);
  const refresh = () => listApps().then(setApps).catch(() => {});
  const refreshInstalled = () => { if (installed.length === 0) listInstalled().then(setInstalled).catch(() => {}); };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const browse = async () => { const p = await pickExe(); if (p) setTarget(p); };

  const describe = (e: HistoryEntry) =>
    `${e.payload?.action === "open" ? "Opened" : "Closed"} ${e.label}`;
  const repeat = (e: HistoryEntry) => {
    const act = e.payload?.action === "open" ? "open" : "close";
    sched.add({
      ...specFromHistory(e),
      label: e.label,
      payload: { action: act, app: e.payload?.app ?? e.label },
    });
  };

  const count = sched.jobs.length;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      <div className="scroll-thin min-h-0 flex-1 space-y-6 overflow-y-auto pb-2">
        {/* Composer — flat, card-free (matches Startup / Settings). */}
        <div className="flex flex-col">
          <ScheduleForm
            allowRecurring={false}
            buttonLabel={action === "open" ? "Schedule open" : "Schedule close"}
            extraField={
              <Field
                label={action === "open" ? "App to open" : "Target app"}
                hint={action === "open" ? "Path to the .exe (or a command)." : "Pick a running app or type a process name."}
              >
                <div className="flex gap-2">
                  <Segmented
                    value={action}
                    onChange={(a) => setAction(a as AppAction)}
                    options={[{ value: "close", label: "Close" }, { value: "open", label: "Open" }]}
                  />
                  {action === "close" ? (
                    <div className="flex-1">
                      <AppCombo value={target} onChange={setTarget} apps={apps} onRefresh={refresh} />
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <AppCombo
                          value={target}
                          onChange={setTarget}
                          apps={installed}
                          onRefresh={refreshInstalled}
                          pickField="path"
                          placeholder="Search installed apps…"
                        />
                      </div>
                      <button onClick={browse} title="Browse for .exe"
                        className="grid h-9 w-10 shrink-0 place-items-center rounded-md border border-strong bg-elev text-text-secondary transition hover:text-text-primary">
                        <FolderOpen size={16} />
                      </button>
                    </>
                  )}
                </div>
              </Field>
            }
            onSubmit={(spec) => {
              const app = target.trim();
              if (!app) return action === "open" ? "Pick an app to open." : "Pick or type a target app.";
              const label = action === "open" ? app.split(/[\\/]/).pop() || app : app;
              sched.add({ ...spec, label, payload: { action, app } });
              setTarget("");
              return null;
            }}
          />
        </div>

        {/* Active | History — stacked below the composer. */}
        <div className="flex min-h-0 flex-col border-t border-subtle pt-5">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[{ value: "active", label: `Active${count ? ` (${count})` : ""}` }, { value: "history", label: "History" }]}
          />
          <div className="mt-4">
            {tab === "active"
              ? <JobList jobs={sched.jobs} now={sched.now} onRemove={sched.remove} />
              : <History module="app-closer" describe={describe} onRepeat={repeat} embedded />}
          </div>
        </div>
      </div>

      <WarningDialog
        job={sched.warning}
        verb={sched.warning
          ? `${(sched.warning.payload as any).action === "open" ? "open" : "close"} “${(sched.warning.payload as any).app}”`
          : ""}
        onCancel={() => sched.warning && sched.cancelWarned(sched.warning.id)}
        onNow={() => sched.warning && sched.fireNow(sched.warning.id)}
        onDismiss={sched.dismissWarning}
      />
    </div>
  );
}
