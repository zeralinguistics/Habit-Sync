# Habit Sync

A personal fitness game for one person: food, workouts, rehab, water, sleep and weight, wrapped in a *Solo Leveling* style
character that levels up as you do the work. No account, no server, no ads. **Everything is stored on your phone.**

The goal is built in: 84 kg to 70 kg in 28 half-kilo gates, five realms, four boss gates (80, 76, 72, 70 kg) and a camp week after each boss.

## Get it on your phone

| Way | What you get | How |
| --- | --- | --- |
| **Android app (APK)** | Samsung Health sync (steps, active calories, sleep, weight, workouts), reminders, backup through the share sheet | Open the [latest release](../../releases/tag/android-latest) on the phone, download `habit-sync.apk`, open it, allow "install unknown apps" once. Each new build installs over the last one and keeps your data. The app tells you in the Forge when a newer build is out. |
| **Web app (PWA)** | Same game, works offline, install it from the browser menu ("Add to Home screen") | After enabling GitHub Pages (below) open <https://zeralinguistics.github.io/Habit-Sync/> on the phone. |

**Enable the web app once:** repository Settings, Pages, "Deploy from a branch", choose this branch and the `/docs` folder, Save.
A workflow keeps `docs/` rebuilt after every change, so the page is always current.

## Your data

* Stored in the app's own storage on the device (`localStorage`, key `habitsync.proto.v4`). The app asks the browser to keep it persistent.
* **Forge, Data vault** has: save a backup file (share it to Drive or WhatsApp), restore from a file or from pasted text, restore the automatic daily copy, and undo the last reset or restore.
  If a save ever cannot be read, the app keeps the unreadable text aside and falls back to the automatic copy.
  Save a backup every few weeks. The Forge tab shows a gold dot when one is overdue.
* History older than 120 days is compacted to daily totals, so the app can run for years inside storage limits.
* Nothing is sent anywhere. Samsung Health access is read-only.

## What is in the game

* **Quests**: weigh-in with sleep, three meals, workout, rehab, protein, clear the day. One big "next move" card says what to do now.
* **Bonus quests**: three small optional extras a day (one ticks itself from your data, two you tick). No penalty for skipping; a clean row raises the daily chest one tier.
* **Armory**: 37 pieces of gear (hood, body, eyes, weapon, aura, companion, title) unlock by doing the work and are never bought.
* **Realms**: each boss gate opens a new realm that changes the colours, backdrop and weather of the whole app.
* **Penalties are real**: skipped sessions cost aura and cause fatigue (half aura, level locked until you train). Pain days and one weekly rest pass are never punished.
* **Teasing** (Off, Playful, Savage) only ever targets a skipped habit, never the body.
* **Rehab**: the external physio's list spread over the training cycle, a guided session with a moving outline and hold timers, and a pain traffic light that holds the strength work back after an amber or red day.
* **Plan**: the campaign sheet shows every gate with a date, calories per realm, camp weeks, and the weekly report adjusts advice to the real trend.

## Develop

```
python3 prototype/build.py                  # dist/habit-sync.html and a fragment for sandboxed hosts
python3 prototype/build.py --pages docs     # the installable web build (CI does this on every push)
python3 prototype/build.py --native app/www # the folder the Android shell wraps
node prototype/test/e2e.js /tmp/            # about 155 end-to-end checks (Playwright + Chromium)
node prototype/test/pwa.js /tmp/            # offline and install checks
```

Layout: `prototype/js` (engine, engine-plus, content, ui-*, avatar, fx, health, notify), `prototype/css`, `prototype/test`,
`app/` (Capacitor Android shell), `.github/workflows` (ci, pages, android).

Rules worth keeping when changing things:

* Saved data must survive every version: add fields in `blank()` and fix old data in `migrate()` in `engine.js`, never rename or drop.
* The engine (`engine*.js`) has no DOM access. The UI listens to its events (`E.on('gate', ...)`).
* Celebrations go through `U.cele(...)` so they queue and never stack.
* Android builds use one fixed signing key (`app/android/app/habit-sync.keystore`) so updates install over each other. It is a personal key, not a store key.
* Never change the Capacitor `appId`, `server.androidScheme` or the signing key. Doing so orphans the data stored in the installed app or blocks updates over it.
* Samsung Health and reminders can only be verified on a real phone. Tests use mocked plugins.
