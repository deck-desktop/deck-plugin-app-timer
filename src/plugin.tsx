import { Field, Select, Segmented } from "../shim/ui.js";
import { useSettings, saveSettings } from "../shim/settings.js";
import AppTimer from "./AppCloser";

// Close an app after a delay or at a time. Rust's scheduler fires it, so it fires with the tab closed.
export default function Tab() {
  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      <div className="min-h-0 flex-1">
        <AppTimer />
      </div>
    </div>
  );
}

/**
 * This plugin's settings, rendered in its own row under Settings > Plugins.
 *
 * These live in DECK'S settings.json rather than a plugin config file, and that is deliberate:
 * the warning is raised by Rust's scheduler thread (src-tauri/src/scheduler.rs), which fires
 * whether or not Deck's window is open and reads settings.json directly. A plugin config file is
 * something only the webview reads, so moving these there would leave the panel adjusting a
 * value nothing acts on.
 *
 * So the panel moved here — beside the timers it governs, rather than in General where it sat
 * next to the user's name — and the storage did not.
 */
export function Settings() {
  const s = useSettings();
  return (
    <div className="space-y-3">
      <Field
        label="Warning before an action fires"
        hint="Timers fire even when Deck is closed — the warning comes from Deck's background scheduler, not this tab."
      >
        <Segmented
          layoutId="sched-warn-mode"
          value={s.warningMode}
          onChange={(m) => saveSettings({ ...s, warningMode: m as typeof s.warningMode })}
          options={[
            { value: "toast", label: "Toast" },
            { value: "window", label: "Open window" },
            { value: "none", label: "None" },
          ]}
        />
      </Field>

      {/* Pointless while nothing is warned, so it goes rather than sitting there disabled. */}
      {s.warningMode !== "none" && (
        <Field label="Warn this many minutes before">
          <Select
            value={String(s.warnLeadMin)}
            onChange={(e) => saveSettings({ ...s, warnLeadMin: Number(e.target.value) })}
            className="w-32"
          >
            {[1, 2, 5, 10, 15].map((n) => <option key={n} value={n}>{n} min</option>)}
          </Select>
        </Field>
      )}
    </div>
  );
}
