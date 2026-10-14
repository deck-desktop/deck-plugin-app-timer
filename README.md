# App Timer

Close an app after a delay or at a time, once or on chosen days.

Split out of the Schedules plugin, which had Startup, App Timer and Power Timer as tabs. App Timer and Power Timer each carry their own copy of the timer code (the form, the list, the warning, history and `scheduler.ts`), because each is published as a repository that has to build on its own; a fix to one belongs in the other too.

## What it exports

| Export | Where it renders |
|---|---|
| `default` | the tab |
| `Settings` | the warning before a timer fires (shared with Power Timer) |
| `mcp` | adding and cancelling app timers, for an agent |

## Checks

```sh
node plugins/app-timer/scheduler.check.mjs
```

Working out when a timer next fires, classifying it, and the countdown - the arithmetic that
decides whether a timer is right.

## Build

```sh
node plugins/app-timer/build.mjs
```

See [../README.md](../README.md) for how the build and the shims work.

## Install

Copy `plugin.json`, `plugin.js` and `mcp.js` into `%APPDATA%\Deck\plugins\app-timer\` (`Deck-Dev` for a
debug build) and restart Deck.
