import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type AppProc } from "../shim/bridge.js";

/**
 * Editable app picker: type a process name, or open a styled dropdown of
 * running apps aligned to the field. Auto-refreshes the app list on open.
 */
export function AppCombo({
  value, onChange, apps, onRefresh, pickField = "name", placeholder = "slack", onPickName,
}: {
  value: string;
  onChange: (v: string) => void;
  apps: AppProc[];
  onRefresh: () => void;
  pickField?: "name" | "path";   // what a picked row writes into the field
  placeholder?: string;
  onPickName?: (name: string) => void;  // optional: also receive the picked app's name
}) {
  const [open, setOpen] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    onRefresh();
    // Open upward if there isn't ~240px of room below the field.
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) setFlipUp(window.innerHeight - r.bottom < 240);
    setOpen(true);
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = value.trim().toLowerCase();
  const filtered = q
    ? apps.filter((a) => a.name.toLowerCase().includes(q) || a.title.toLowerCase().includes(q))
    : apps;

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); if (!open) openMenu(); }}
        onFocus={openMenu}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-strong bg-elev px-3 text-sm text-text-primary outline-none transition focus:border-accent focus:shadow-glow"
      />
        <AnimatePresence>
          {open && filtered.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: flipUp ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: flipUp ? 4 : -4 }}
              transition={{ duration: 0.12 }}
              className={
                "scroll-thin absolute z-30 max-h-40 w-full overflow-y-auto rounded-md border border-strong bg-elev py-1 shadow-card " +
                (flipUp ? "bottom-full mb-1" : "top-full mt-1")
              }
            >
              {filtered.map((a) => (
                <li key={a.name}>
                  <button
                    type="button"
                    onClick={() => { onChange(pickField === "path" ? a.path : a.name); onPickName?.(a.name); setOpen(false); }}
                    className="flex w-full flex-col items-start px-3 py-1.5 text-left transition hover:bg-card"
                  >
                    <span className="text-sm text-text-primary">{a.name}</span>
                    {(a.title || a.path) && <span className="w-full truncate text-[11px] text-text-muted">{a.title || a.path}</span>}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
      </AnimatePresence>
    </div>
  );
}
