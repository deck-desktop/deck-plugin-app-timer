---
name: deck-app-timer
description: >
  Close an app on Hasan's PC after a delay or at a time, once or on chosen days, through the App
  Timer plugin's Deck MCP tools. TRIGGER when asked to close or quit an app later, in N minutes,
  or at a set time.
---

# Deck App Timer

`deck_add_app_timer` / `deck_cancel_app_timer`, from the App Timer plugin: the tools exist only
while it is installed. File-backed: the tool writes JSON that Deck watches, and its Rust scheduler
picks the change up live. Deck does not need restarting, but it **does** need to be running when
the timer is due.

```
deck_add_app_timer  target: "chrome",  delayMinutes: 45
deck_add_app_timer  target: "chrome",  atTime: "23:00",
                    recurring: true, days: ["Monday","Tuesday","Wednesday","Thursday","Friday"]
```

- `target` is a **process name** (`chrome`, not a `chrome.exe` path).
- `delayMinutes` **or** `atTime`, not both. Recurring needs `atTime` plus at least one day;
  `recurring` with `delayMinutes` is rejected.
- Deck shows a cancellable warning before firing (5 min by default).
- `deck_list` shows every timer with its id; cancel with `deck_cancel_app_timer` and that id.
- Times are 24-hour `HH:mm`, local. Days are full English names (`"Monday"`).
- The tools write to the **installed** Deck's config, not a dev build (`Deck-Dev`).
