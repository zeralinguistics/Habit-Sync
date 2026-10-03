# Habit Sync: notes for whoever works on this next

A personal, phone-first fitness game for one person (food, workouts, rehab, water, sleep, weight) in a *Solo Leveling* style.
Goal in the app: 84 kg to 70 kg, 28 half-kilo gates, bosses at 80, 76, 72 and 70 kg, camp weeks after each boss.
The owner uses an Android phone with Samsung Health and follows a physio-guided knee and lower-back rehab plan.

## Where things are

* `prototype/` is the whole app. Vanilla JS on one `window.HS` namespace, no framework, no build step except `build.py`.
  * `js/engine.js`, `js/engine-plus.js`: state, rules, events. No DOM access. The UI subscribes with `E.on(name, fn)`.
  * `js/ui-*.js`: screens and sheets. Clicks are delegated: `data-a="name:arg"` calls `HS.ui.act.name(arg, element)`.
  * `js/content.js` (items, realms, goals, voice lines), `js/data.js` (foods, rehab plan, default routine), `js/fx.js` (sound, haptics, particles, themes), `js/avatar.js`, `js/health.js`, `js/notify.js`, `js/native.js`, `js/pwa.js`.
  * `build.py`: `--pages docs` (web build for GitHub Pages), `--native app/www --build N` (Android assets), default (standalone files in `dist/`).
* `app/` is the Capacitor 8 Android shell. CI (`.github/workflows/android.yml`) builds and signs the APK and publishes it to the `android-latest` release.
* `docs/` is the built web site (a workflow keeps it current). Never edit it by hand; run `python3 prototype/build.py --pages docs`.
* State lives in `localStorage` key `habitsync.proto.v4` (schema 5). `migrate()` in `engine.js` repairs old or damaged saves field by field.

## Run the checks

```
PLAYWRIGHT_PATH=<playwright module dir> CHROME=<chrome binary> node prototype/test/e2e.js /tmp/   # ~180 checks, ~3 min
PLAYWRIGHT_PATH=... CHROME=... node prototype/test/pwa.js /tmp/                                   # offline and install
```

The tests pin the page clock to Monday 5 Oct 2026 12:30 and mock the native plugins. Add a regression check for every bug fixed.

## Decisions that must not be undone

* **No body shaming, ever.** Teasing (Off / Playful / Savage) only targets a skipped habit. A test scans every voice line for body words.
* **No promised recovery timeline.** The rehab moves are the physio's written list plus general cues. The pain traffic light (green 0 to 3, amber 4 to 5, red 6+ or any sharp pain) is a proposal for the physio to confirm, and the roadmap is a DRAFT. Jefferson curl is left out on purpose. Squat and deadlift are capped at 30 to 40 kg by the owner.
* **Real penalties:** a skipped session costs aura and starts fatigue (half aura, level locked until training). Pain days and one rest pass a week are never punished. Rest on demand is the pass or a pain day, not a relabel.
* **Gear is earned, never bought.** Realms change the whole UI at boss gates.
* The day ends at 3 am (`cfg.dayStart`): `E.dkey()` and `E.nowMin()` are shifted, so clearing the day at 1 am belongs to yesterday.

## Rules worth keeping

* Saved data must survive every version: add fields in `blank()`, repair old data in `migrate()`, never rename or drop. Judge the *saved* value in `migrate()` (a default filled in earlier must not hide an old field).
* Never change the Capacitor `appId`, `server.androidScheme` or the signing key (`app/android/app/habit-sync.keystore`): it would orphan installed data or block updates. The key is committed in a public repo on purpose (so builds on any machine can update each other); move it to Actions secrets if that ever matters.
* Anything destructive needs a deliberate second tap (`armed()` in `ui-forge.js`) and an undo copy (`E.snapshot()`).
* Gates are a high-water mark; the ladder is anchored on the goal weight; the rest pass belongs to the week of the day it covers; training-cycle corrections add an anchor (`S.cycles`) instead of rewriting history.
* Celebrations go through `U.cele(...)` so they queue and never stack. A plain `U.render()` is quiet (no entrance animation); `U.render(true)` plays it.

## What is verified and what is not

Verified by automated checks and several adversarial review passes: all game rules, migration from older saves, backups and undo, offline PWA from a sub-path, layouts at 320 to 390 px, the Android CI build, and the Health Connect call shapes against the plugin's own source.
Not verified on a real phone: Samsung Health data through Health Connect, notification delivery, haptics and sound in the Android WebView, and GitHub Pages hosting (the owner must enable it in the repository settings).
