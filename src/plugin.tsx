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

// The warning before a timer fires is Deck's setting (Settings > General > Timers): Deck's
// scheduler raises it, for App Timer and Power Timer alike.
