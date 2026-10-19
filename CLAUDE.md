# Habit Sync: notes for whoever works on this next

A personal, phone-first fitness game for one person (food, workouts, rehab, water, sleep, weight) in a *Solo Leveling* style.
Goal in the app: 84 kg to 70 kg, 28 half-kilo gates, bosses at 80, 76, 72 and 70 kg, camp weeks after each boss.
The owner uses an Android phone with Samsung Health and follows a physio-guided knee and lower-back rehab plan.

## Where things are

* `prototype/` is the whole app. Vanilla JS on one `window.HS` namespace, no framework, no build step except `build.py`.
  * `js/engine.js`, `js/engine-plus.js`, `js/nutri.js`: state, rules, events, nutrients and the energy balance. No DOM access. The UI subscribes with `E.on(name, fn)`.
  * `js/ui-*.js`: screens and sheets. Clicks are delegated: `data-a="name:arg"` calls `HS.ui.act.name(arg, element)`.
  * `js/nutri-data.js` is GENERATED (IFCT 2017 foods and recipes, 26 nutrients per 100 g) by `tools/nutrition/build_nutrition.py`: never edit it by hand, edit `ingredients.py` / `recipes.py` and rebuild. `tools/nutrition/REPORT.md` lists every dish with its old and new value and the plausibility warnings.
  * `js/widget-art.js` draws the home-screen widgets as PNGs on a canvas, `js/widget.js` sends them to the Android plugin `HabitWidget` (`app/android/.../HabitWidgetPlugin.java`, `StreakWidget`, `WeekWidget`, `TodayWidget` only show the image).
  * `js/content.js` (items, realms, goals, voice lines, daily targets, supplements), `js/data.js` (food layer, mess menu, rehab plan, default routine), `js/fx.js` (sound, haptics, particles, themes), `js/avatar.js`, `js/health.js`, `js/notify.js`, `js/native.js`, `js/pwa.js`.
  * `build.py`: `--pages docs` (web build for GitHub Pages), `--native app/www --build N` (Android assets), default (standalone files in `dist/`).
* `app/` is the Capacitor 8 Android shell. CI (`.github/workflows/android.yml`) builds and signs the APK and publishes it to the `android-latest` release.
* `docs/` is the built web site (a workflow keeps it current). Never edit it by hand; run `python3 prototype/build.py --pages docs`.
* State lives in `localStorage` key `habitsync.proto.v4` (schema 5). `migrate()` in `engine.js` repairs old or damaged saves field by field.

## Run the checks

```
node prototype/test/calories.js                       # food table (Atwater, USDA/IFCT anchors, every mess dish has a row) and workout calorie formulas, no browser
PLAYWRIGHT_PATH=<playwright module dir> CHROME=<chrome binary> node prototype/test/e2e.js /tmp/   # ~250 checks, ~10 min
PLAYWRIGHT_PATH=... CHROME=... node prototype/test/pwa.js /tmp/                                   # offline and install
```

The tests pin the page clock to Monday 5 Oct 2026 12:30 and mock the native plugins. Add a regression check for every bug fixed.

## Decisions that must not be undone

* **No body shaming, ever.** Teasing (Off / Playful / Savage) only targets a skipped habit. A test scans every voice line for body words.
* **No promised recovery timeline.** The rehab moves are the physio's written list plus general cues. The pain traffic light (green 0 to 3, amber 4 to 5, red 6+ or any sharp pain) is a proposal for the physio to confirm, and the roadmap is a DRAFT. Jefferson curl is left out on purpose. Squat and deadlift are capped at 30 to 40 kg by the owner.
* **Real penalties:** a skipped session costs aura and starts fatigue (half aura, level locked until training). Pain days and one rest pass a week are never punished. Rest on demand is the pass or a pain day, not a relabel.
* **Gear is earned, never bought.** Realms change the whole UI at boss gates.
* **Training is a rotation, not a calendar.** Push, Pull, Legs, Rest repeat in that order and the pointer (`S.rot.i`) moves only when a session is finished (a rest day moves it when the day passes). A missed session stays due. Rest days are cardio days (walking and running, `E.completeCardio`), never punished and never move the rotation. `S.cycles` only reads days from before the rotation existed.
* **Rehab follows the session:** Push gets Day 1, Pull Day 2, Legs Day 3. One-sided moves (`{sides:'each'}`) are done and counted per side. Knee to chest is 30 s per leg; the physio confirmed it, although the printed sheet says 10 s.
* **The protein backup is the owner's Yogabar Pro Clean Plant Protein** (38 g scoop, 153 kcal, 25.3 g protein from a retailer listing; carbohydrate and fat are an estimate). Replace it with the label values if they differ.
* **Food numbers come from a source you can name.** IFCT 2017 rows or recipes built from them (tiers A, B), typical pack or restaurant values (C), and the owner's own labels (L). Vitamin D counts only from animal foods, B12 is not in IFCT and is not shown. Mess dishes are estimates (15 to 25 percent), say so, and do not claim more.
* **The streak is the daily spark:** 3, 4 or 5 of six pillars (check-in, fuel, protein, move, rehab, water) light the day. Shields (one to start, one more every 7 days, two at most) save a missed day once the streak is 2 or more. Pain days and the rest pass never break it. The same six pillars are the day's score when it is cleared (`E.dayStatus`, `d.score` is 0 to 6; 3 or more is a good day, the chest is rare at 3 or 4 and epic at 5 or 6); staying inside the calorie window is a +80 aura bonus on top, not a pillar. Days cleared before 0.6 keep their old score out of 4.
* **Calories burned are net of resting energy** (ACSM treadmill equations, `E.burnEst`) and are information only: the calorie target already includes training, so the app says not to eat them back. Samsung Health active kcal reads generous; it is shown beside the estimate, not instead of it. `E.energyVerdict` compares the log with the weight trend.
* The day ends at 3 am (`cfg.dayStart`): `E.dkey()` and `E.nowMin()` are shifted, so clearing the day at 1 am belongs to yesterday.

## Rules worth keeping

* Saved data must survive every version: add fields in `blank()`, repair old data in `migrate()`, never rename or drop. Judge the *saved* value in `migrate()` (a default filled in earlier must not hide an old field).
* Never change the Capacitor `appId`, `server.androidScheme` or the signing key (`app/android/app/habit-sync.keystore`): it would orphan installed data or block updates. The key is committed in a public repo on purpose (so builds on any machine can update each other); move it to Actions secrets if that ever matters.
* Anything destructive needs a deliberate second tap (`armed()` in `ui-forge.js`) and an undo copy (`E.snapshot()`).
* Gates are a high-water mark; the ladder is anchored on the goal weight; the rest pass belongs to the week of the day it covers; a day settled in the past keeps the session it had (`d.plan`, `d.sess`).
* Celebrations go through `U.cele(...)` so they queue and never stack. A plain `U.render()` is quiet (no entrance animation); `U.render(true)` plays it.

## What is verified and what is not

Verified by automated checks and several adversarial review passes: all game rules, migration from older saves, backups and undo, offline PWA from a sub-path, layouts at 320 to 390 px, the Android CI build, and the Health Connect call shapes against the plugin's own source.
Not verified on a real phone: Samsung Health data through Health Connect (walks and runs as workouts, heart rate, floors), notification delivery, haptics and sound in the Android WebView, the home-screen widgets (the Java and XML compile only in CI; the images are drawn and checked in the browser), and GitHub Pages hosting (the owner must enable it in the repository settings).
