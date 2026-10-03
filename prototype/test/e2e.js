/* End-to-end checks for Habit Sync.
   Run: PLAYWRIGHT_PATH=/path/to/playwright CHROME=/path/to/chrome node prototype/test/e2e.js [outDir]
   The page clock is pinned to Monday 5 Oct 2026, 12:30, so the checks do not depend on when they run. */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('path');
const out = process.argv[2] || '/tmp/';
const url = process.env.HS_URL || ('file://' + path.resolve(__dirname, '..', 'index.html'));
const seedSrc = require('./seed.js').src;
const TODAY = '2026-10-05';
let failed = 0, passed = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (c) passed++; else failed++; };
const S = pg => pg.evaluate(() => JSON.parse(JSON.stringify(HS.E.S())));
const pin = (iso) => {
  const Real = Date, off = new Real(iso).getTime() - Real.now();
  class Fake extends Real { constructor(...a) { if (a.length === 0) super(Real.now() + off); else super(...a); } static now() { return Real.now() + off; } }
  window.Date = Fake;
};
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const mk = async (init, iso) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await ctx.addInitScript(pin, iso || '2026-10-05T12:30:00');
    if (init) await ctx.addInitScript(init);
    const pg = await ctx.newPage();
    pg.errs = [];
    pg.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|favicon|Blocked call to navigator.vibrate/.test(m.text())) pg.errs.push(m.text()); });
    pg.on('pageerror', e => pg.errs.push('PAGEERR ' + e.message));
    return pg;
  };
  const clr = pg => pg.evaluate(() => { HS.ui.clearCele(); document.getElementById('sys').className = ''; });
  const pg = await mk();
  await pg.goto(url); await pg.waitForTimeout(900);

  /* ---------- first run: the awakening ---------- */
  ok(await pg.evaluate(() => document.querySelector('#shT').textContent === 'Awakening' && document.querySelector('#sheet').classList.contains('on')), 'first run opens the Awakening sheet');
  await pg.screenshot({ path: out + 'a0-welcome.png' });
  ok(await pg.evaluate(() => !!document.querySelector('#shFoot [data-a="wRestore"]')), 'the welcome sheet offers "I already have a backup"');
  await pg.fill('#wName', 'Rin'); await pg.click('[data-a="wroast:savage"]'); await pg.click('[data-a="wGo"]'); await pg.waitForTimeout(500);
  let s = await S(pg);
  ok(s.cfg.name === 'RIN' && s.cfg.roast === 'savage' && s.welcomed && s.startW === 84 && s.cfg.goalW === 70, 'awakening saves name, savage teasing, 84 to 70 kg');
  ok(s.cfg.kcal === 2050 && s.cfg.protein === 140, 'targets come from the numbers: 2050 kcal, 140 g protein');
  ok(await pg.evaluate(() => document.querySelector('#ov').classList.contains('on') && /ARISE/.test(document.querySelector('#ovb').textContent)), 'the ARISE moment plays');
  await clr(pg);

  /* ---------- engine rules ---------- */
  const R = await pg.evaluate(() => {
    const E = HS.E, p = E.plan(), lad = E.ladder();
    return { lad: lad.length, bosses: lad.filter(g => g.boss).map(g => g.kg).join(), weeks: p.weeks, camps: p.camps, finish: p.finish, expFinish: E.addDays(E.S().start, 217), exp0: E.expected().expected, k84: E.kcalFor(84), k80: E.kcalFor(80),
      lv2: E.LVF(2), rkE: E.rankOf(5), rkD: E.rankOf(6), rkS: E.rankOf(30), rkA: E.rankOf(29), burn: E.burnEst(84, 60, 15, 10), items: HS.ITEMS.length, realms: HS.REALMS.length,
      parse: [E.parsePart('rice 200g').g, E.parsePart('2 chapati').units, E.parsePart('chicken 150').tn, E.parsePart('momos 350 kcal').kc] };
  });
  ok(R.lad === 28 && R.bosses === '80,76,72,70', 'gate ladder to 70 kg: 28 gates, bosses at 80, 76, 72, 70');
  ok(R.weeks === 31 && R.camps === 3 && R.finish === R.expFinish, 'campaign plan: 31 weeks including 3 camp weeks, finish ' + R.finish);
  ok(R.exp0 === 84 && R.k84 === 2050 && R.k80 === 1990, 'plan starts at 84 kg; calories step from 2050 to 1990 at the first boss');
  ok(R.lv2 === 200 && R.rkE === 'E' && R.rkD === 'D' && R.rkS === 'S' && R.rkA === 'A', 'level 2 needs 200 aura, a new rank every six levels (D at 6, S at 30)');
  ok(R.burn >= 555 && R.burn <= 560, 'burn estimate for the default session: ' + R.burn);
  ok(JSON.stringify(R.parse) === '[200,2,150,350]', 'typed input parser: ' + JSON.stringify(R.parse));
  ok(R.items >= 33 && R.realms === 5, 'armory holds ' + R.items + ' items across 7 slots and 5 realms');

  /* ---------- home ---------- */
  await pg.evaluate(() => { HS.ui.tab = 'home'; HS.ui.render(true); }); await pg.waitForTimeout(1200);
  await pg.screenshot({ path: out + 'a1-home.png' });
  ok(await pg.evaluate(() => /Log lunch/i.test(document.querySelector('.move').textContent)), 'next move at 12:30 is "Log lunch": ' + await pg.evaluate(() => document.querySelector('.move b').textContent));
  ok(await pg.evaluate(() => !!document.querySelector('.hero-av svg.av') && !!document.querySelector('.scene svg.scn') && !!document.querySelector('#bubble')), 'character, realm backdrop and speech bubble are drawn');
  await pg.click('#waterTile .wmain'); await pg.click('#waterTile .wmain'); await pg.waitForTimeout(300);
  ok((await S(pg)).days[TODAY].water === 500, 'water: two taps add 500 ml');
  await pg.click('#waterTile .wundo'); await pg.waitForTimeout(200);
  ok((await S(pg)).days[TODAY].water === 250, 'water: undo takes 250 ml back');
  await pg.evaluate(() => { HS.ui.act.poke(); }); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => document.querySelector('#bubble').textContent.length > 10), 'poking the hunter makes him talk');

  /* ---------- weigh-in with sleep ---------- */
  await pg.click('[data-a="node:weigh"]'); await pg.waitForTimeout(500);
  await pg.screenshot({ path: out + 'a2-weigh.png' });
  await pg.click('[data-a="slp:0.5"]'); await pg.click('[data-a="wSave"]'); await pg.waitForTimeout(500);
  s = await S(pg);
  ok(s.days[TODAY].weighed && s.weights[TODAY] === 84 && s.days[TODAY].sleep === 7.5, 'weigh-in and 7.5 h of sleep saved');
  ok(s.aura >= 15 + 15 + 30 * 0, 'weigh-in and good sleep both pay aura (' + s.aura + ')');
  await clr(pg);

  /* ---------- plate: tiles, typing, ruler, stars ---------- */
  await pg.click('[data-a="node:lunch"]'); await pg.waitForTimeout(600);
  await pg.click('.tile >> nth=0'); await pg.waitForTimeout(150);
  await pg.click('.tile >> nth=1'); await pg.waitForTimeout(700);
  await pg.fill('#mIn', '200g rice, 2 chapati'); await pg.press('#mIn', 'Enter'); await pg.waitForTimeout(700);
  const items = (await S(pg)).days[TODAY].items;
  const rice = items.find(i => i.name === 'Plain rice'), chap = items.find(i => i.name === 'Chapati');
  ok(rice && rice.g === 200 && chap && chap.g === 80, 'typed grams stored exactly: rice ' + (rice && rice.g) + ' g, chapati ' + (chap && chap.g) + ' g');
  ok(await pg.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return r('#mIn').bottom <= innerHeight && r('[data-a="mealDone"]').bottom <= innerHeight && r('#rows').height > 120; }), 'input, tile rows and Done are all on screen together');
  await pg.screenshot({ path: out + 'a3-plate.png' });
  await pg.evaluate(() => { const i = HS.E.day().items.findIndex(x => x.name === 'Plain rice'); document.querySelector('[data-a="edit:' + i + '"]').click(); });
  await pg.waitForTimeout(400);
  await pg.evaluate(() => { const r = document.querySelector('#ruler'); r.dispatchEvent(new Event('pointerdown')); r.scrollLeft = 520; });
  await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => HS.E.day().items.find(x => x.name === 'Plain rice').g) === 260, 'scrolling the ruler sets the grams (200 g to 260 g)');
  await pg.click('[data-a="mealDone"]'); await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => !!document.querySelector('#ovb .stars') && document.querySelectorAll('#ovb .stars i.on').length >= 1), 'finishing a plate shows its star rating');
  await pg.screenshot({ path: out + 'a4-stars.png' });
  ok((await S(pg)).days[TODAY].done.lunch === true, 'lunch is marked done'); await clr(pg);

  /* ---------- usuals and repeat ---------- */
  await pg.evaluate(() => { const E = HS.E, k = E.addDays(E.dkey(), -1), d = E.day(k); d.items = [{ name: 'Boiled egg', meal: 'dinner', g: 100 }, { name: 'Chapati', meal: 'dinner', g: 80 }]; d.done.dinner = true; E.save(); });
  await pg.evaluate(() => HS.ui.plateSheet('dinner')); await pg.waitForTimeout(600);
  ok(await pg.evaluate(() => !!document.querySelector('.repeat') && /Boiled egg/.test(document.querySelector('.repeat').textContent)), 'an empty plate offers "same as last time"');
  await pg.click('.repeat'); await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => HS.E.day().items.filter(i => i.meal === 'dinner').length) === 2, 'one tap repeats the whole previous meal');
  await pg.evaluate(() => { HS.ui.closeSheet(); const d = HS.E.day(); d.items = d.items.filter(i => i.meal !== 'dinner'); delete d.done.dinner; HS.E.save(); }); await pg.waitForTimeout(300);

  /* ---------- the phone's Back button closes a sheet, not the app ---------- */
  await pg.evaluate(() => HS.ui.weighSheet()); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => document.querySelector('#sheet').classList.contains('on')), 'a sheet is open');
  await pg.goBack(); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => !document.querySelector('#sheet').classList.contains('on') && !!document.querySelector('.hero-av')), 'Back closes the sheet and stays in the app');
  await pg.evaluate(() => { HS.ui.weighSheet(); }); await pg.waitForTimeout(300);
  await pg.evaluate(() => { HS.ui.closeSheet(); HS.ui.weighSheet(); }); await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => document.querySelector('#sheet').classList.contains('on')), 'closing one sheet and opening another straight away keeps the new one open');
  await pg.evaluate(() => HS.ui.closeSheet()); await pg.waitForTimeout(400);

  /* ---------- workout and victory ---------- */
  await pg.evaluate(() => HS.ui.render(true));
  await pg.click('[data-a="node:gym"]'); await pg.waitForTimeout(400);
  await pg.click('[data-a="liftStart"]'); await pg.waitForTimeout(500);
  await pg.click('[data-a="exedit:0"]'); await pg.click('[data-a="exw:0:2.5"]'); await pg.click('[data-a="exw:0:2.5"]');
  await pg.click('[data-a="set:0:0"]'); await pg.click('[data-a="set:0:1"]'); await pg.waitForTimeout(400);
  ok((await S(pg)).last['Incline dumbbell press'].w === 5, 'set logged from the edited weight (5 kg)');
  await pg.click('[data-a="liftFinish"]'); await pg.waitForTimeout(300);
  await pg.click('[data-a="gymNext"]');
  await pg.waitForFunction(() => !!document.querySelector('#ovb .vstats'), null, { timeout: 6000 }).catch(() => {});   /* wait for the moment itself, not a fixed time: a slow machine must not fail the check */
  ok(await pg.evaluate(() => !!document.querySelector('#ovb .vstats') && /TRAINING COMPLETE/.test(document.querySelector('#ovb').textContent)), 'finishing a workout plays the victory moment');
  await pg.screenshot({ path: out + 'a5-victory.png' });
  await clr(pg);
  await pg.click('[data-a="pk:sharp"]'); await pg.click('[data-a="gymFinish"]'); await pg.waitForTimeout(500);
  s = await S(pg);
  ok(s.days[TODAY].workout === 'done' && s.days[TODAY].burn >= 555 && s.stats.STR >= 3 && s.days[TODAY].runFree === 3, 'workout saved: burn ' + s.days[TODAY].burn + ', STR ' + s.stats.STR);
  ok(!!s.owned.wpn_dagger && s.equip.weapon === 'wpn_dagger', 'the first finished workout unlocks and equips the Hunter\'s Dagger');
  await clr(pg);

  /* ---------- rehab: schedule and guided session ---------- */
  await pg.click('[data-a="node:rehab"]'); await pg.waitForTimeout(700);
  await pg.screenshot({ path: out + 'a6-rehab.png' });
  const rk = await pg.evaluate(() => HS.E.rehabKeys());
  ok(rk.length === 11 && rk.indexOf('d0_4') < 0, 'push-day rehab has 11 moves (block + knee range + Day 1 core) and skips the Jefferson curl');
  ok(await pg.evaluate(() => document.querySelectorAll('svg.fig').length) >= 10, 'every move shows a moving outline');
  await pg.click('[data-a="rguide"]'); await pg.waitForTimeout(600);
  ok(await pg.evaluate(() => !!document.querySelector('.gd svg.fig.big') && /1 \/ 11/.test(document.querySelector('.gtop span').textContent)), 'guided session opens at move 1 of 11 with a big outline');
  await pg.screenshot({ path: out + 'a7-guide.png' });
  /* skip timer waits: stub the hold length by completing each move through its own set button */
  for (let i = 0; i < 11; i++) {
    const info = await pg.evaluate(() => { const g = HS.ui.sh.g; return g ? { i: g.i, hold: /Start hold/.test(document.querySelector('#gsetBtn').textContent) } : null; });
    if (!info) break;
    if (info.hold) { await pg.evaluate(() => { const g = HS.ui.sh.g; const it = g.list[g.i]; HS.E.day().reh.items[it.key] = true; HS.E.save(); HS.ui.act.gskip(); }); }
    else { for (let k = 0; k < 4; k++) { const again = await pg.evaluate(() => HS.ui.sh && HS.ui.sh.g && HS.ui.sh.g.i); if (again !== info.i) break; await pg.click('#gsetBtn'); await pg.waitForTimeout(450); } }
    await pg.waitForTimeout(150);
  }
  await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => HS.E.rehabProgress().done) === 11, 'all 11 rehab moves are ticked after the guided session');
  await pg.click('[data-a="rehabFinish"]'); await pg.waitForTimeout(600);
  s = await S(pg);
  ok(s.days[TODAY].reh.done === true, 'rehab quest is cleared at 80% or more'); await clr(pg);

  /* ---------- clear the day and open the chest ---------- */
  await pg.evaluate(() => { HS.E.day().skip.dinner = true; HS.E.day().skip.breakfast = true; HS.E.save(); });
  await pg.evaluate(() => HS.ui.closeDaySheet()); await pg.waitForTimeout(500);
  await pg.screenshot({ path: out + 'a8-close.png' });
  await pg.click('[data-a="lock"]'); await pg.waitForTimeout(800);
  ok((await S(pg)).days[TODAY].closed === true, 'the day is cleared');
  ok(await pg.evaluate(() => /DAY CLEARED/.test(document.querySelector('#ovb').textContent)), 'clearing the day shows the result and a chest button');
  await pg.click('#ovb [data-a="chestOpen"]'); await pg.waitForTimeout(2200);
  s = await S(pg);
  ok(s.days[TODAY].chest && s.days[TODAY].chest.aura >= 15, 'the daily chest opens for ' + (s.days[TODAY].chest && s.days[TODAY].chest.aura) + ' aura');
  await pg.screenshot({ path: out + 'a9-chest.png' }); await clr(pg);

  /* ---------- armory ---------- */
  await pg.evaluate(() => HS.ui.act.tab('armory')); await pg.waitForTimeout(800);
  await pg.screenshot({ path: out + 'b1-armory.png' });
  ok(await pg.evaluate(() => document.querySelectorAll('.ic').length >= 5), 'armory lists the gear for the selected slot');
  await pg.evaluate(() => HS.ui.act.slot('weapon')); await pg.waitForTimeout(300);
  await pg.click('[data-a="item:wpn_none"]'); await pg.waitForTimeout(300);
  ok((await S(pg)).equip.weapon === 'wpn_none', 'tapping owned gear equips it');
  await pg.click('[data-a="item:wpn_twin"]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => /unlock/i.test(document.querySelector('#sysT').textContent) && (HS.E.S().equip.weapon === 'wpn_none')), 'tapping locked gear explains how to unlock it');
  await pg.click('[data-a="item:wpn_dagger"]'); await pg.waitForTimeout(200);
  await pg.click('[data-a="realm:r3"]'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => /boss gate/i.test(document.querySelector('#sysT').textContent) && HS.E.S().realm === 'r1'), 'locked realms stay locked until their boss falls');

  /* ---------- a boss falls: the world changes ---------- */
  await pg.evaluate(() => { HS.ui.act.tab('home'); const E = HS.E, S = E.S(); for (let i = 1; i <= 30; i++) S.weights[E.addDays(E.dkey(), -i)] = 79.4; E.logWeight(79.4); });
  await pg.waitForTimeout(1500);
  ok(await pg.evaluate(() => /ARISE/.test(document.querySelector('#ovb').textContent) && /BOSS DOWN|FINAL BOSS/.test(document.querySelector('#ovb').textContent)), 'crossing 80 kg plays a BOSS ARISE moment (not a plain gate)');
  await pg.screenshot({ path: out + 'b2-boss.png' });
  s = await S(pg);
  ok(s.cfg.kcal === 1990 && s.camp && s.camp.kcal > 2400, 'boss lowers daily calories to 1990 and starts a camp week at maintenance (' + (s.camp && s.camp.kcal) + ' kcal)');
  ok(await pg.evaluate(() => HS.E.T().camp === true && HS.E.T().kcal > 2400), 'this week\'s target is the maintenance number');
  /* the queue: arise, then realm, then gear */
  let seen = [];
  for (let i = 0; i < 6; i++) {
    const t = await pg.evaluate(() => document.querySelector('#ov').classList.contains('on') ? document.querySelector('#ovb').textContent.slice(0, 60) : '');
    if (t) seen.push(t.replace(/\s+/g, ' ')); await pg.evaluate(() => HS.ui.act.ovClose()); await pg.waitForTimeout(700);
  }
  ok(seen.some(t => /NEW REALM/.test(t)) && seen.some(t => /ITEM/.test(t)), 'celebrations queue one after another: ' + seen.map(t => t.slice(0, 18)).join(' | '));
  s = await S(pg);
  ok(s.realm === 'r2' && !!s.owned.hood_crown && s.equip.hood === 'hood_crown', 'realm 2 opens and the Iron Crown is equipped');
  ok(await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() === '#a678ff'), 'the whole app re-themes to the Monarch palette');
  await clr(pg); await pg.waitForTimeout(300);
  await pg.screenshot({ path: out + 'b3-realm2.png' });

  /* ---------- path ---------- */
  await pg.evaluate(() => HS.ui.act.tab('path')); await pg.waitForTimeout(1500);
  await pg.screenshot({ path: out + 'b4-path.png' });
  ok(await pg.evaluate(() => !!document.querySelector('.pchart .cplan') && !!document.querySelector('.gsil') && !!document.querySelector('#road')), 'path shows the plan chart, the final-form silhouette and the road');
  await pg.evaluate(() => HS.ui.act.campaign()); await pg.waitForTimeout(600);
  ok(await pg.evaluate(() => document.querySelectorAll('.rc2').length === 5 && /28/.test(document.querySelector('#shBody .dis').textContent)), 'campaign sheet lists four realms plus the final form and 28 gates');
  await pg.screenshot({ path: out + 'b5-campaign.png' });
  await pg.evaluate(() => HS.ui.closeSheet());
  await pg.evaluate(() => HS.ui.act.streaks()); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => document.querySelectorAll('.gl2').length >= 11), 'goals and streaks sheet lists five weekly goals and seven streaks');
  await pg.evaluate(() => HS.ui.closeSheet());

  /* ---------- forge: customise ---------- */
  await pg.evaluate(() => HS.ui.act.tab('forge')); await pg.waitForTimeout(700);
  await pg.click('[data-a="help"]'); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => /Aura and levels/.test(document.querySelector('#shBody').textContent) && /camp week/i.test(document.querySelector('#shBody').textContent)), 'the Forge explains how the game works in plain words');
  await pg.screenshot({ path: out + 'b5b-help.png' });
  await pg.evaluate(() => HS.ui.closeSheet()); await pg.waitForTimeout(300);
  await pg.click('[data-a="roast:off"]'); await pg.waitForTimeout(200);
  ok((await S(pg)).cfg.roast === 'off' && await pg.evaluate(() => HS.say('roast', 'skip', 'off') === ''), 'teasing can be switched off');
  await pg.click('[data-a="roast:playful"]');
  await pg.fill('[data-cfg="kcal"]', '2200');
  ok(await pg.evaluate(() => HS.E.cfg().kcal === 2200), 'settings change the calorie target live');
  await pg.fill('[data-cfg="kcal"]', '1990');
  await pg.click('[data-a="theme:ember"]'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() === '#ff8a3d'), 'a fixed theme overrides the realm');
  await pg.click('[data-a="theme:auto"]'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() === '#a678ff'), '"My realm" follows the realm again');
  await pg.screenshot({ path: out + 'b6-forge.png' });

  /* ---------- the data vault ---------- */
  const backup = await pg.evaluate(() => HS.E.backupText());
  ok(/"app":"habit-sync"/.test(backup) && backup.length > 500, 'backup text is produced (' + backup.length + ' bytes)');
  const before = await S(pg);
  await pg.evaluate(() => { HS.E.S().aura = 1; HS.E.save(); });
  await pg.setInputFiles('#restoreFile', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(backup) }); await pg.waitForTimeout(600);
  ok((await S(pg)).aura === before.aura, 'restoring from a backup file brings the state back exactly');
  await pg.evaluate(() => HS.ui.act.tab('forge')); await pg.waitForTimeout(400);
  await pg.setInputFiles('#restoreFile', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') }); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => /not a Habit Sync backup/i.test(document.querySelector('#sysT').textContent)) && (await S(pg)).aura === before.aura, 'a wrong file is refused and nothing is lost');
  const cmp = await pg.evaluate(() => {
    const E = HS.E, S = E.S(), old = E.addDays(E.dkey(), -200), d = E.day(old);
    d.items = [{ name: 'Plain rice', meal: 'lunch', g: 200 }]; d.pAward = true; const t = E.totals(d).k; const n = E.compact();
    return { n: n, kept: d.compact === true && d.items.length === 0 && Math.round(E.totals(d).k) === Math.round(t) && d.pAward === true };
  });
  ok(cmp.n >= 1 && cmp.kept, 'old days are compacted to totals so the app can run for years');
  await pg.evaluate(() => { HS.E.restoreAuto && 0; });

  /* ---------- consequences (fresh state) ---------- */
  await pg.evaluate(() => { HS.E.reset(); HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.tab = 'home'; HS.ui.render(true); });
  await pg.evaluate(() => { const E = HS.E; E.S().aura = 380; E.save(); });
  const lv0 = await pg.evaluate(() => HS.E.lv().L);
  await pg.evaluate(() => HS.E.skipWorkout()); await pg.waitForTimeout(250);
  const a = await pg.evaluate(() => ({ aura: HS.E.S().aura, fat: HS.E.fatigued() }));
  ok(a.aura === 320 && a.fat, 'skipping costs 60 aura and starts fatigue (aura ' + a.aura + ')');
  ok(await pg.evaluate(() => { const r = document.querySelector('#ovb p.roast'); return !!r && r.textContent.length > 15 && !/\\b(fat|ugly|body|weight|belly|obese)\\b/i.test(r.textContent); }), 'a skip is teased, about the habit and never the body');
  await clr(pg);
  await pg.evaluate(() => HS.E.addAura(100));
  ok((await S(pg)).aura === 370, 'while fatigued, gains are halved (+100 became +50)');
  await pg.evaluate(() => HS.E.addAura(1000));
  const c1 = await pg.evaluate(() => HS.E.lv());
  ok(c1.locked && c1.L === lv0, 'level is locked while fatigued (stays LV ' + c1.L + ', raw LV ' + c1.raw + ')');
  await pg.evaluate(() => HS.E.completeWorkout('Push'));
  const d1 = await pg.evaluate(() => HS.E.lv());
  ok(!d1.locked && d1.L === d1.raw && d1.L > lv0, 'training lifts the lock and the level catches up (LV ' + d1.L + ')');
  await pg.evaluate(() => { HS.E.painDay(); });
  ok(await pg.evaluate(() => !HS.E.fatigued()), 'a pain day is never punished');
  await clr(pg);

  /* ---------- the voice never mentions the body ---------- */
  const bad = await pg.evaluate(() => { const all = []; const walk = o => { if (Array.isArray(o)) o.forEach(x => typeof x === 'string' ? all.push(x) : walk(x)); else if (o && typeof o === 'object') Object.values(o).forEach(walk); }; walk(HS.VOICE); return all.filter(t => /\b(fat|ugly|obese|chubby|belly|gut|flab|pig|lard|overweight|skinny|weak|lazy)\b/i.test(t)); });
  ok(bad.length === 0, 'none of the ' + await pg.evaluate(() => { let n = 0; const w = o => { if (Array.isArray(o)) o.forEach(x => typeof x === 'string' ? n++ : w(x)); else if (o && typeof o === 'object') Object.values(o).forEach(w); }; w(HS.VOICE); return n; }) + ' voice lines mention the body or call you names ' + JSON.stringify(bad));

  /* ---------- streaks, goals and unlock rules on seeded history ---------- */
  const info = await pg.evaluate(`(${seedSrc})(24)`);
  await clr(pg);
  const G = await pg.evaluate(() => { const E = HS.E; return { clear: E.streak('clear'), goals: E.goalsActive().length, owned: Object.keys(E.S().owned).length, mood: E.mood(), report: E.report().advice.title, ahead: E.expected().ahead, week: E.rehabWeek().length }; });
  ok(info.gates >= 4 && G.goals === 5 && G.owned >= 8 && G.week === 7, 'seeded history: ' + info.gates + ' gates, 5 weekly goals, ' + G.owned + ' items owned');
  ok(G.ahead > 0 && /pace|Plateau|Adherence|Dropping/i.test(G.report), 'weekly report and plan comparison work on real data (' + G.report + ', ahead ' + G.ahead + ' kg)');
  await pg.evaluate(() => { HS.ui.tab = 'home'; HS.ui.render(true); }); await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => document.querySelectorAll('.goals .gc').length >= 5), 'home shows this week\'s goal cards');

  /* ---------- a day that ends at 3 am, for someone who goes to bed after midnight ---------- */
  const lp = await mk(null, '2026-10-06T01:10:00');
  await lp.goto(url); await lp.waitForTimeout(800);
  await lp.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.render(true); }); await lp.waitForTimeout(500);
  const L1 = await lp.evaluate(() => ({ k: HS.E.dkey(), m: HS.E.nowMin(), sit: HS.E.situation(), hdr: Array.from(document.querySelectorAll('.wt em')).map(e => e.textContent).find(t => /done/.test(t)) }));
  ok(L1.k === '2026-10-05' && L1.m >= 1500 && L1.m <= 1520, 'at 01:10 it is still yesterday (' + L1.k + ', minute ' + L1.m + ')');
  ok(/closes in 1h 4\dm|closes in 1h 5\dm/.test(L1.hdr), 'the quest list says when the day really closes: ' + L1.hdr);
  ok(L1.sit === 'late', 'the late-night nudge applies after midnight');
  await lp.evaluate(() => { const d = HS.E.day(); d.skip = { breakfast: 1, lunch: 1, dinner: 1 }; d.workout = 'pain'; HS.E.save(); HS.E.closeDay(); });
  ok(await lp.evaluate(() => { const S = HS.E.S(); return !!S.days['2026-10-05'].closed && !S.days['2026-10-06']; }), 'clearing the day at 01:10 closes yesterday, not the new day');
  await lp.evaluate(() => { HS.E.cfg().dayStart = 0; HS.E.setShift(0); });
  ok(await lp.evaluate(() => HS.E.dkey()) === '2026-10-06', 'with the day ending at midnight, 01:10 is the next day');
  const lp2 = await mk(null, '2026-10-06T03:10:00');
  await lp2.goto(url); await lp2.waitForTimeout(700);
  ok(await lp2.evaluate(() => HS.E.dkey() === '2026-10-06' && HS.E.nowMin() < 200), 'at 03:10 the new day has begun');
  ok(lp.errs.length === 0 && lp2.errs.length === 0, 'no console errors around the day boundary');

  /* ---------- layout ---------- */
  ok(!(await pg.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), 'no horizontal page scroll');
  ok(pg.errs.length === 0, 'no console errors ' + JSON.stringify(pg.errs));

  /* ---------- Samsung Health through a mock Health Connect ---------- */
  const hp = await mk(() => {
    const now = Date.now();
    window.__calls = [];
    window.Capacitor = { isNativePlatform: () => true, Plugins: { Health: {
      isAvailable: async () => ({ available: true }),
      requestAuthorization: async o => { window.__calls.push(['auth', o.read]); return { readAuthorized: o.read, readDenied: [] }; },
      queryAggregated: async o => ({ samples: [{ value: o.dataType === 'steps' ? 7412 : 318 }] }),
      readSamples: async o => o.dataType === 'sleep' ? { samples: [{ startDate: new Date(now - 9 * 36e5).toISOString(), endDate: new Date(now - 1.5 * 36e5).toISOString(), value: 450 }] } : { samples: [{ value: 83.6, startDate: new Date(now - 36e5).toISOString() }] },
      queryWorkouts: async () => ({ workouts: [{ workoutType: 'strengthTraining', duration: 3600, totalEnergyBurned: 310 }] })
    } } };
  });
  await hp.goto(url); await hp.waitForTimeout(900);
  await hp.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.act.tab('path'); }); await hp.waitForTimeout(600);
  ok(await hp.evaluate(() => /Connect Samsung Health/.test(document.querySelector('#screen').textContent)), 'the Android app offers to connect Samsung Health');
  const cn = await hp.evaluate(async () => { const r = await HS.health.connect(); return r; });
  ok(cn.ok && (await hp.evaluate(() => window.__calls[0][1].join())) === 'steps,calories,sleep,weight,workouts', 'connect asks for read-only steps, calories, sleep, weight and workouts');
  const sy = await hp.evaluate(async () => { const r = await HS.health.sync(); const d = HS.E.day(); return { r: r, steps: d.steps, hs: d.hSteps, act: d.hAct, sleep: d.sleep, hw: d.hWeight, work: d.hWork }; });
  ok(sy.r.ok && sy.steps === '7412' && sy.act === 318 && sy.sleep === 7.5 && sy.hw === 83.6 && sy.work.kcal === 310, 'sync fills steps 7412, 318 active kcal, 7.5 h sleep, weight 83.6 and the workout');
  await hp.evaluate(() => HS.ui.act.tab('forge')); await hp.waitForTimeout(500);
  ok(await hp.evaluate(() => /Reminders/.test(document.querySelector('#screen').textContent)), 'the Forge shows the reminders section in the Android app');
  const up0 = await hp.evaluate(async () => { let called = 0; window.fetch = async () => { called++; return { ok: false }; }; const r = await HS.native.checkUpdate(); return { r: r, called: called }; });
  ok(up0.r === null && up0.called === 0, 'a development build never contacts GitHub');
  const up1 = await hp.evaluate(async () => { HS.BUILD = 5; HS.E.S().update = null; window.fetch = async () => ({ ok: true, json: async () => ({ name: 'Habit Sync for Android (build 9)', assets: [{ name: 'habit-sync.apk', browser_download_url: 'https://example.test/habit-sync.apk' }] }) }); return await HS.native.checkUpdate(); });
  ok(up1 && up1.latest === 9 && /habit-sync\.apk$/.test(up1.url), 'the Android app notices that build 9 is newer than build 5');
  const up2 = await hp.evaluate(async () => { HS.ui.update = await HS.native.checkUpdate(); HS.ui.act.tab('forge'); HS.ui.tab = 'forge'; HS.ui.render(); return document.querySelector('#screen').textContent; });
  ok(/Update ready: download build 9 \(you have 5\)/.test(up2), 'the Forge shows the update card');
  ok(hp.errs.length === 0, 'no console errors in the native mock ' + JSON.stringify(hp.errs));

  /* ---------- reminders through a mock local-notifications plugin ---------- */
  const np = await mk(() => {
    window.__sched = []; window.__granted = false;
    window.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: {
      checkPermissions: async () => ({ display: window.__granted ? 'granted' : 'prompt' }),
      requestPermissions: async () => { window.__granted = true; return { display: 'granted' }; },
      createChannel: async () => {}, getPending: async () => ({ notifications: [] }), cancel: async () => {},
      schedule: async o => { window.__sched.push(o.notifications); }
    } } };
  });
  await np.goto(url); await np.waitForTimeout(800);
  await np.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.act.tab('forge'); }); await np.waitForTimeout(500);
  await np.click('[data-a="remind:1"]'); await np.waitForTimeout(900);
  const sc = await np.evaluate(() => ({ n: window.__sched.length ? window.__sched[window.__sched.length - 1].length : 0, first: window.__sched.length ? window.__sched[window.__sched.length - 1][0] : null, on: HS.E.S().remind.on }));
  ok(sc.on && sc.n >= 60 && sc.first && sc.first.isExactNotification === false, 'reminders schedule ' + sc.n + ' friendly nudges over 14 days, inexact so no special permission is needed');
  ok(np.errs.length === 0, 'no console errors with reminders ' + JSON.stringify(np.errs));

  /* ---------- bonus quests: three small optional extras a day ---------- */
  const bq = await mk();
  await bq.goto(url); await bq.waitForTimeout(800);
  await bq.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.tab = 'home'; HS.ui.render(true); HS.E.rng = () => .5; }); await bq.waitForTimeout(1300);
  const b0 = await bq.evaluate(() => {
    const E = HS.E, r = E.bonusToday(), r2 = E.bonusToday(), sets = new Set();
    for (let i = 0; i < 12; i++) sets.add(E.bonusToday(E.addDays(E.dkey(), i)).map(x => x.id).join());
    return { ids: r.map(x => x.id), same: r.map(x => x.id).join() === r2.map(x => x.id).join(), autos: r.filter(x => x.auto).length, varied: sets.size, rows: document.querySelectorAll('#bonusWin .brow').length };
  });
  ok(b0.ids.length === 3 && b0.autos === 1 && b0.same && b0.varied >= 4 && b0.rows === 3, 'three bonus quests a day (one ticks itself, two you tick), stable through the day, different across days: ' + b0.ids.join());
  const mrow = await bq.evaluate(() => HS.E.bonusToday().find(x => !x.auto));
  const aura0 = (await S(bq)).aura;
  const sel = id => '#bonusWin [data-a="bonus:' + id + '"]';
  await bq.click(sel(mrow.id)); await bq.waitForTimeout(400);
  const b1 = await bq.evaluate(id => ({ aura: HS.E.S().aura, done: document.querySelector('#bonusWin [data-a="bonus:' + id + '"]').classList.contains('done'), n: HS.E.S().counters.bonus }), mrow.id);
  ok(b1.aura === aura0 + mrow.a && b1.done && b1.n === 1, 'ticking a bonus quest pays its aura once (+' + mrow.a + ') and shows it done');
  await bq.click(sel(mrow.id)); await bq.waitForTimeout(250); await bq.click(sel(mrow.id)); await bq.waitForTimeout(300);
  const b2 = await bq.evaluate(id => ({ aura: HS.E.S().aura, n: HS.E.S().counters.bonus, done: document.querySelector('#bonusWin [data-a="bonus:' + id + '"]').classList.contains('done') }), mrow.id);
  ok(b2.aura === aura0 + mrow.a && b2.n === 1 && b2.done, 'unticking and ticking again never pays twice');
  const au = await bq.evaluate(() => {
    const E = HS.E, d = E.day(), a = E.bonusToday().find(x => x.auto), aura = E.S().aura;
    if (a.id === 'b_meals') d.done = { breakfast: true, lunch: true, dinner: true };
    if (a.id === 'b_stars') d.stars = { lunch: 3 };
    if (a.id === 'b_sleep') d.sleep = 7.5;
    if (a.id === 'b_water') d.water = 2000;
    if (a.id === 'b_steps') d.steps = '5000';
    E.save(); return { id: a.id, a: a.a, aura: aura };
  });
  await bq.waitForTimeout(500);
  const b3 = await bq.evaluate(id => ({ aura: HS.E.S().aura, claimed: !!HS.E.S().claimed['bonus:' + HS.E.dkey() + ':' + id], n: HS.E.S().counters.bonus, toast: document.querySelector('#sysT').textContent, done: document.querySelector('#bonusWin [data-a="bonus:' + id + '"]').classList.contains('done') }), au.id);
  ok(b3.claimed && b3.done && b3.n === 2 && b3.aura >= au.aura + au.a && /Bonus quest done/.test(b3.toast), 'the self-ticking bonus pays when the data says so (' + au.id + ') and the card updates without a re-render');
  const other = await bq.evaluate(() => HS.E.bonusToday().find(x => !x.auto && !x.done));
  const aura1 = (await S(bq)).aura;
  await bq.click(sel(other.id)); await bq.waitForTimeout(500);
  const b4 = await bq.evaluate(() => ({ aura: HS.E.S().aura, all: !!HS.E.day().bonusAll, set: document.querySelector('#bonusWin').classList.contains('allset'), toast: document.querySelector('#sysT').textContent }));
  ok(b4.all && b4.set && b4.aura === aura1 + other.a + 25 && /\+25 aura/.test(b4.toast), 'three out of three adds a +25 aura bonus and gilds the card');
  const ch = await bq.evaluate(() => { const E = HS.E, d = E.day(); d.chest = null; const up = E.openChest(2).tier; d.chest = null; d.bonusAll = false; const plain = E.openChest(2).tier; d.chest = null; return { up: up, plain: plain }; });
  ok(ch.up === 'rare' && ch.plain === 'common', 'a clean bonus row lifts the daily chest one tier (common became rare)');
  const nm = await bq.evaluate(() => {
    const E = HS.E, d = E.day(); d.closed = true; d.chest = { tier: 'common', aura: 20, crit: false }; d.bonus = {}; d.bonusAll = true;
    const left = E.bonusToday().filter(x => !x.done).length, mv = HS.ui.nextMove();
    return { left: left, id: mv.id, title: mv.title };
  });
  ok(nm.left >= 1 && nm.id === 'bonus' && /Bonus quests/.test(nm.title), 'once the day is cleared, the next move points at the unfinished bonus quests');
  const ex = await bq.evaluate(() => { const E = HS.E; E.S().counters.bonus = 30; E.checkUnlocks(); return !!E.S().owned.title_extra; });
  ok(ex, 'thirty bonus quests unlock the Extra Credit title');
  const rd = await bq.evaluate(() => {
    const E = HS.E; let walkOk = 0, walkRed = 0;
    for (let i = 0; i < 40; i++) if (E.bonusToday(E.addDays(E.dkey(), i)).some(x => x.id === 'm_walk')) walkOk++;
    E.day().reh = { items: {}, day: 0, knee: 7, back: 0, sharp: false, done: true, n: 1 };
    for (let i = 0; i < 40; i++) if (E.bonusToday(E.addDays(E.dkey(), i)).some(x => x.id === 'm_walk')) walkRed++;
    return { walkOk: walkOk, walkRed: walkRed, light: E.lastLight() };
  });
  ok(rd.walkOk > 0 && rd.light === 'red' && rd.walkRed === 0, 'after a red pain check-in the walking bonus is never offered (' + rd.walkOk + ' of 40 days before, ' + rd.walkRed + ' after)');
  const qz = await bq.evaluate(async () => {
    HS.ui.tab = 'home'; HS.ui.render(); await new Promise(r => setTimeout(r, 120));
    const plain = document.getAnimations().filter(a => a.animationName === 'rise').length;
    HS.ui.render(true); await new Promise(r => setTimeout(r, 120));
    return { plain: plain, full: document.getAnimations().filter(a => a.animationName === 'rise').length };
  });
  ok(qz.plain === 0 && qz.full >= 5, 'a plain re-render does not replay the entrance animation; a tab switch does (' + qz.plain + ' vs ' + qz.full + ')');
  const pr = await bq.evaluate(() => { const E = HS.E, s = E.S(); s.claimed['bonus:2026-06-01:b_meals'] = 1; s.claimed['bonus:2026-10-04:b_meals'] = 1; E.compact(); return { old: !!s.claimed['bonus:2026-06-01:b_meals'], recent: !!s.claimed['bonus:2026-10-04:b_meals'] }; });
  ok(!pr.old && pr.recent, 'old bonus claims are pruned so the save stays small for years');
  ok(bq.errs.length === 0, 'no console errors with bonus quests ' + JSON.stringify(bq.errs));

  /* ---------- an old, damaged or unreadable save still opens ---------- */
  const tabsOk = pg2 => pg2.evaluate(() => { const o = {}; ['home', 'armory', 'path', 'forge'].forEach(t => { try { HS.ui.tab = t; HS.ui.render(); o[t] = document.querySelector('#screen').textContent.length > 200; } catch (e) { o[t] = 'ERR ' + e.message; } }); return o; });
  const old = await mk(() => {
    /* a v0.3 save: schema 4, goal 75 kg, no routine, no equipment, no realm, days without the newer fields */
    const today = new Date(), k = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const days = {}, weights = {};
    for (let i = 10; i >= 1; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days[k(d)] = { items: [{ name: 'Plain rice', meal: 'lunch', g: 200 }], done: { lunch: true }, skip: {}, workout: i % 2 ? 'done' : null, pain: null, burn: 0, mins: null, runFree: null, reh: i % 3 ? { items: { b0: true }, day: 0, knee: 2, back: 1, sharp: false, done: true, n: 5 } : null, lift: {}, weighed: true, pAward: i % 2 === 0, closed: true, delta: 100, sugarPen: 0, score: 3, steps: '' }; weights[k(d)] = 84 - (10 - i) * .2; }
    const st = { v: 4, cfg: { name: 'PLAYER', kcal: 2050, protein: 140, goalW: 75, gateStep: .5, bossEvery: 4, stepGoal: 0, strict: 'standard', theme: 'shadow', volume: .8, haptics: true, sound: true, contract: '', partner: '' }, aura: 2500, stats: { STR: 5, VIT: 6, AGI: 1, SNS: 3 }, startW: 84, start: k(new Date(today.getTime() - 11 * 864e5)), weights: weights, gates: [83.5, 83, 82.5], cycle: { a: k(today), i: 0 }, days: days, custom: {}, rehab: { confirmed: false, next: 0 }, routine: null, last: {}, pr: {}, fatigue: null, pass: { wk: '', used: false }, missStreak: 0, swept: {} };
    localStorage.setItem('habitsync.proto.v4', JSON.stringify(st));
  });
  await old.goto(url); await old.waitForTimeout(900);
  const og = await old.evaluate(() => { const S = HS.E.S(); return { v: S.v, goal: S.cfg.goalW, theme: S.cfg.theme, gates: S.gates.length, routine: Object.keys(S.routine).join(), push: S.routine.Push.length, aura: S.aura, days: Object.keys(S.days).length, weights: Object.keys(S.weights).length }; });
  ok(og.v === 5 && og.goal === 70 && og.theme === 'auto' && og.gates === 3 && og.aura >= 2500 && og.days >= 10 && og.weights === 10, 'a v0.3 save is upgraded without losing anything: goal 75 became 70, 3 gates, aura ' + og.aura + ', 10 days');
  ok(og.routine === 'Push,Pull,Legs' && og.push === 6, 'a missing gym routine falls back to the default');
  const ot = await tabsOk(old);
  ok(ot.home === true && ot.armory === true && ot.path === true && ot.forge === true, 'all four tabs open from an old save ' + JSON.stringify(ot));
  ok(old.errs.length === 0, 'no console errors from an old save ' + JSON.stringify(old.errs));

  const dm = await mk(() => {
    const k = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const st = { v: 5, cfg: null, aura: 'lots', weights: null, gates: 'x', gateDates: [], days: {}, routine: { Push: 'x', Pull: [{ n: 'Row', g: 'Back', sets: 3, reps: 10 }] }, equip: null, owned: [], health: 7, stats: null, counters: 3, rehab: null, cycle: null };
    st.days[k(1)] = null; st.days[k(2)] = { items: 'nope', done: null, workout: 'done' }; st.days[k(3)] = [];
    localStorage.setItem('habitsync.proto.v4', JSON.stringify(st));
  });
  await dm.goto(url); await dm.waitForTimeout(900);
  const dg = await dm.evaluate(() => { const S = HS.E.S(); return { aura: S.aura, gates: Array.isArray(S.gates), push: S.routine.Push.length, pull: S.routine.Pull[0].n, days: Object.keys(S.days).length, items: Array.isArray(Object.values(S.days)[0] && Object.values(S.days)[0].items) }; });
  ok(dg.aura === 0 && dg.gates && dg.push === 6 && dg.pull === 'Row' && dg.items, 'a damaged save is repaired field by field: bad fields reset, good ones (a custom Pull routine) kept');
  const dt = await tabsOk(dm);
  ok(dt.home === true && dt.armory === true && dt.path === true && dt.forge === true, 'all four tabs open from a damaged save ' + JSON.stringify(dt));
  ok(dm.errs.length === 0, 'no console errors from a damaged save ' + JSON.stringify(dm.errs));

  const un = await mk(() => {
    const good = { v: 5, cfg: { name: 'BACKUP' }, aura: 321, days: { '2026-10-04': { items: [], done: {}, workout: 'done' }, '2026-10-03': { items: [], done: {} } } };
    if (!localStorage.getItem('habitsync.proto.v4')) { localStorage.setItem('habitsync.proto.v4', '{"v":5,"cfg":{"name":"HALF'); localStorage.setItem('habitsync.proto.v4.bak', JSON.stringify(good)); }
  }, '2026-10-06T01:30:00');   /* 01:30 is inside the hours when the app's day and the calendar day differ */
  await un.goto(url); await un.waitForTimeout(1600);
  ok(await un.evaluate(() => HS.E.unreadable === true && HS.E.recovered === true && HS.E.S().cfg.name === 'BACKUP' && /could not be read/.test(document.querySelector('#sysT').textContent)), 'an unreadable save is replaced by yesterday\'s automatic copy, with a clear message');
  const uk = await un.evaluate(() => { HS.E.save(); return { raw: localStorage.getItem('habitsync.proto.v4.unreadable'), bak: JSON.parse(localStorage.getItem('habitsync.proto.v4.bak')).aura, main: JSON.parse(localStorage.getItem('habitsync.proto.v4')).cfg.name }; });
  ok(uk.raw === '{"v":5,"cfg":{"name":"HALF' && uk.bak === 321 && uk.main === 'BACKUP', 'the unreadable text is kept aside, the good automatic copy is not overwritten, even at 01:30');
  const ur = await un.evaluate(() => { const n = HS.E.restoreAuto(), S = HS.E.S(); return { n: n, name: S.cfg.name, aura: S.aura, both: !!S.days['2026-10-04'] && !!S.days['2026-10-03'] }; });
  ok(ur.n >= 2 && ur.both && ur.name === 'BACKUP' && ur.aura === 321, 'restoring the automatic copy by hand also works');
  ok(un.errs.length === 0, 'no console errors around an unreadable save ' + JSON.stringify(un.errs));

  /* ---------- review fixes: data safety ---------- */
  const quota = await mk(() => {
    /* the automatic copy cannot be written (storage almost full), but the real save must still go through */
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (/\.bak$/.test(k)) throw new Error('QuotaExceededError'); return set.call(this, k, v); };
  });
  await quota.goto(url); await quota.waitForTimeout(700);
  const qr = await quota.evaluate(() => { const E = HS.E; E.S().welcomed = true; E.S().aura = 777; E.S().lastAutoBak = '1999-01-01'; E.save(); return JSON.parse(localStorage.getItem('habitsync.proto.v4')).aura; });
  ok(qr === 777, 'a failing automatic copy never blocks the real save');
  const full = await mk(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'habitsync.proto.v4' && window.__full) throw new Error('QuotaExceededError'); return set.call(this, k, v); }; });
  await full.goto(url); await full.waitForTimeout(700);
  await full.evaluate(() => { window.__full = true; HS.E.S().welcomed = true; HS.E.save(); }); await full.waitForTimeout(300);
  ok(await full.evaluate(() => /refused to save/.test(document.querySelector('#sysT').textContent)), 'when the phone refuses to save, the player is told right away');

  const tw = await mk();
  await tw.goto(url); await tw.waitForTimeout(800);
  await tw.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.E.save(); });
  const tw2 = await tw.context().newPage(); tw2.errs = [];
  tw2.on('pageerror', e => tw2.errs.push('PAGEERR ' + e.message));
  await tw2.goto(url); await tw2.waitForTimeout(800);
  await tw2.evaluate(() => { HS.E.logWeight(83.4); });   /* the other copy of the app records a weigh-in */
  await tw.waitForTimeout(400);
  const twSeen = await tw.evaluate(() => Object.keys(HS.E.S().weights).length);
  await tw.evaluate(() => HS.E.addWater(250));          /* then the first copy saves something else */
  const kept = await tw.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('habitsync.proto.v4')).weights).length);
  ok(twSeen === 1 && kept === 1, 'a second copy of the app adopts the other one\'s work instead of overwriting it');
  ok(tw.errs.length === 0 && tw2.errs.length === 0, 'no errors with two copies open');

  const rs = await mk();
  await rs.goto(url); await rs.waitForTimeout(800);
  await rs.evaluate(`(${seedSrc})(31)`);
  await rs.evaluate(() => { HS.ui.closeSheet(); HS.ui.clearCele(); HS.ui.tab = 'forge'; HS.ui.render(true); }); await rs.waitForTimeout(500);
  const days0 = await rs.evaluate(() => Object.keys(HS.E.S().days).length);
  await rs.click('#resetBtn'); await rs.waitForTimeout(60); await rs.click('#resetBtn'); await rs.waitForTimeout(200);
  ok(await rs.evaluate(() => Object.keys(HS.E.S().days).length) === days0, 'an instant double tap on Reset does nothing');
  await rs.waitForTimeout(900); await rs.click('#resetBtn'); await rs.waitForTimeout(500);
  ok(await rs.evaluate(() => Object.keys(HS.E.S().days).length) < 3, 'a deliberate second tap resets');
  const und = await rs.evaluate(() => HS.E.undoInfo());
  ok(und && und.days >= days0 - 1, 'the old state is kept aside for an undo (' + (und && und.days) + ' days)');
  await rs.evaluate(() => { HS.ui.tab = 'forge'; HS.ui.render(true); }); await rs.waitForTimeout(400);
  ok(await rs.evaluate(() => /Undo last reset or restore/.test(document.querySelector("#vaultWrap").textContent)), 'the Data vault offers the undo');
  const back = await rs.evaluate(() => { HS.E.reset(); return HS.E.undoLast(); });
  ok(back >= days0 - 1, 'undo brings everything back, even after a second reset (' + back + ' days)');
  ok(rs.errs.length === 0, 'no console errors around reset and undo ' + JSON.stringify(rs.errs));

  const cb = await mk(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => window.__clipOk ? Promise.resolve() : Promise.reject(new Error('denied')) }, configurable: true }); document.execCommand = () => false; });   /* headless Chromium lets execCommand('copy') succeed with no user gesture; a real phone does not */
  await cb.goto(url); await cb.waitForTimeout(700);
  await cb.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.tab = 'forge'; HS.ui.render(true); window.__clipOk = false; HS.ui.act.bkCopy(); }); await cb.waitForTimeout(400);
  const cbr = await cb.evaluate(() => ({ lb: HS.E.S().lastBackup, msg: document.querySelector('#bkMsg').textContent, toast: document.querySelector('#sysT').textContent }));
  ok(cbr.lb === 0 && /Select all/.test(cbr.msg) && /Select and copy/.test(cbr.toast), 'a refused clipboard write is reported honestly and the backup reminder stays on');
  await cb.evaluate(() => { window.__clipOk = true; HS.ui.act.bkCopy(); }); await cb.waitForTimeout(400);
  ok(await cb.evaluate(() => HS.E.S().lastBackup > 0 && /Copied to the clipboard/.test(document.querySelector('#bkMsg').textContent)), 'a real copy counts as a backup');

  /* ---------- review fixes: rules that gave wrong results ---------- */
  {
    const rp = await mk(() => {
      /* count the timers that are alive, to catch one that never stops */
      const live = new Set(), si = window.setInterval, ci = window.clearInterval;
      window.__live = live;
      window.setInterval = function (f, t) { const id = si.call(window, f, t); live.add(id); return id; };
      window.clearInterval = function (id) { live.delete(id); return ci.call(window, id); };
    });
    await rp.goto(url); await rp.waitForTimeout(800);
    await rp.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.clearCele(); });

    const L = await rp.evaluate(() => {
      const E = HS.E, S = E.S(), out = {};
      [84, 83.6, 84.3, 84.6].forEach(sw => { S.startW = sw; const l = E.ladder(); out[sw] = { n: l.length, last: l[l.length - 1].kg, lastBoss: l[l.length - 1].boss, bosses: l.filter(g => g.boss).map(g => g.kg).join() }; });
      S.startW = 84; return out;
    });
    ok(L[84].n === 28 && L[84].bosses === '80,76,72,70' && L[83.6].n === 28 && L[84.3].n === 29 && L[84.6].n === 30, 'gate counts follow the start weight: 28, 28, 29, 30');
    ok(Object.keys(L).every(k => L[k].last === 70 && L[k].lastBoss), 'whatever the start weight, the last gate is the goal and it is a boss');

    const G = await rp.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; S.startW = 84;
      for (let i = 1; i <= 20; i++) S.weights[E.addDays(E.dkey(), -i)] = 79.9;
      E.logWeight(79.9);
      const a1 = S.aura, g1 = S.gates.length, camp1 = JSON.stringify(S.camp), kcal1 = S.cfg.kcal;
      S.startW = 84.6; E.logWeight(79.9);
      S.cfg.gateStep = 1; E.logWeight(79.9); S.cfg.gateStep = .5;
      return { a1: a1, g1: g1, a2: S.aura, g2: S.gates.length, same: camp1 === JSON.stringify(S.camp) && kcal1 === S.cfg.kcal, boss: S.gates.indexOf(80) >= 0 };
    });
    ok(G.g1 >= 8 && G.boss && G.a2 === G.a1 && G.same, 'changing the start weight or gate size afterwards never pays a gate twice (aura ' + G.a1 + ' stays ' + G.a2 + ')');

    const C = await rp.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; const today = E.dkey();
      S.start = E.addDays(today, -14); S.cycles = [{ a: S.start, i: 0 }]; S.cycle = { a: S.start, i: 0 };
      const past = []; for (let i = 14; i >= 1; i--) past.push(E.planFor(E.addDays(today, -i)));
      const todayPlan = E.planFor(), target = todayPlan === 'Pull' ? 'Legs' : 'Pull';
      E.setSession(target);
      const past2 = []; for (let i = 14; i >= 1; i--) past2.push(E.planFor(E.addDays(today, -i)));
      HS.ui.closeSheet(); HS.ui.gymSheet();
      const rest = document.querySelectorAll('#shBody [data-a="sess:Rest"]').length;
      HS.ui.act.sess('Rest');
      const r = { same: past.join() === past2.join(), now: E.planFor(), target: target, anchors: S.cycles.length, rest: rest, stillTrain: E.planFor() === target };
      HS.ui.closeSheet(); return r;
    });
    ok(C.same && C.now === C.target && C.anchors === 2, 'correcting today\'s session starts a new anchor and never rewrites earlier days');
    ok(C.rest === 0 && C.stillTrain, 'a training day cannot be relabelled as Rest (that is what the rest pass and the pain day are for)');

    const I = await rp.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; S.aura = 400;
      E.skipWorkout(); const a1 = S.aura; E.painDay(); E.skipWorkout(); const r = E.restPass();
      return { w: E.day().workout, a1: a1, a2: S.aura, r: r, pe: getComputedStyle(document.querySelector('#sheet')).pointerEvents };
    });
    ok(I.w === 'lazy' && I.a2 === I.a1 && I.r === false, 'a skipped session is settled once: a second tap or another button changes nothing (aura ' + I.a1 + ')');
    ok(I.pe === 'none', 'a closed sheet cannot catch taps while it slides away');

    const GR = await rp.evaluate(async () => {
      const E = HS.E, U = HS.ui; E.reset(); E.S().welcomed = true; U.closeSheet(); E.day().reh = null;
      U.rehabSheet(); U.act.rguide();
      const g = U.sh.g, idx = g.list.findIndex(it => /^\d+\s*[×x]\s*\d+$/.test(it.rx.trim()));
      if (idx < 0) return { skip: true };
      while (g.i < idx) U.act.gskip();
      const it = g.list[idx], sets = +it.rx.trim().split(/[×x]/)[1], nextIt = g.list[idx + 1];
      for (let i = 0; i < sets; i++) U.act.gset();
      U.act.gset(); U.act.gset();   /* extra taps inside the half second before the next move is drawn */
      await new Promise(r => setTimeout(r, 800));
      const items = E.day().reh.items;
      return { moved: g.i - idx, done: !!items[it.key], nextTicked: !!items[nextIt.key] };
    });
    ok(GR.skip || (GR.moved === 1 && GR.done && !GR.nextTicked), 'extra taps on the last set of a rehab move advance one move, never two');

    const CK = await rp.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; const today = E.dkey(), y = E.addDays(today, -1);
      S.start = E.addDays(today, -5);
      E.day(y).reh = { items: {}, day: 0, knee: 7, back: 2, sharp: false, done: true, n: 5, checked: true };
      E.day().reh = { items: {}, day: 0, knee: 0, back: 0, sharp: false, done: true, n: 5, checked: false };
      const a = E.lastLight(), h1 = E.rehabToday().hold;
      E.day().reh.checked = true;
      return { a: a, h1: h1, b: E.lastLight(), h2: E.rehabToday().hold };
    });
    ok(CK.a === 'red' && CK.h1 === 'red' && CK.b === 'green' && CK.h2 === null, 'a finished session with untouched pain sliders does not erase yesterday\'s red light; only a real check-in does');

    const QA = await rp.evaluate(() => {
      const E = HS.E, U = HS.ui; E.reset(); E.S().welcomed = true; U.closeSheet(); U.plateSheet('lunch');
      const add = t => { document.querySelector('#mIn').value = t; U.act.mAdd(); };
      const ph = document.querySelector('#mIn').placeholder;
      add('shake 400 kcal'); const k1 = Math.round(E.mealKcal(E.day(), 'lunch'));
      add('momos 350 kcal'); const k2 = Math.round(E.mealKcal(E.day(), 'lunch'));
      add('momos 500 kcal'); const k3 = Math.round(E.mealKcal(E.day(), 'lunch'));
      U.closeSheet(); return { k1: k1, d2: k2 - k1, d3: k3 - k2, ph: ph };
    });
    ok(Math.abs(QA.k1 - 400) <= 10 && Math.abs(QA.d2 - 350) <= 10 && Math.abs(QA.d3 - 500) <= 10 && /kcal/.test(QA.ph), 'a typed kcal figure is honoured every time (400, +350, +500 kcal logged: ' + QA.k1 + ', ' + QA.d2 + ', ' + QA.d3 + ')');

    const CC = await rp.evaluate(async () => {
      const U = HS.ui; U.clearCele();
      const card = n => ({ kind: 'plain', ms: 60000, html: '<h1>CARD ' + n + '</h1>' });
      U.cele(card('A')); U.cele(card('B')); U.cele(card('C'));
      await new Promise(r => setTimeout(r, 400));
      const first = document.querySelector('#ovb').textContent;
      U.act.ovClose(); U.act.ovClose();
      await new Promise(r => setTimeout(r, 700));
      const second = document.querySelector('#ovb').textContent; U.clearCele();
      return { first: first, second: second };
    });
    ok(/CARD A/.test(CC.first) && /CARD B/.test(CC.second), 'two quick taps close one celebration card, the next one is not skipped unseen');

    const ST = await rp.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; const today = E.dkey();
      S.start = E.addDays(today, -600);
      for (let i = 0; i < 540; i++) E.day(E.addDays(today, -i)).weighed = true;
      const info = E.streakInfo('weigh');
      return { n: info.n, start: info.start, expect: E.addDays(today, -539) };
    });
    ok(ST.n === 540 && ST.start === ST.expect, 'a streak longer than 500 days counts in full and its start does not slide');

    const AK = await rp.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.cfg.kcal = 1700; E.onGate({ kg: 80, boss: true }); const a = S.cfg.kcal;
      S.cfg.kcal = 2050; E.onGate({ kg: 80, boss: true }); return { a: a, b: S.cfg.kcal };
    });
    ok(AK.a === 1700 && AK.b === 1990, 'the automatic calorie step only ever lowers a target (1700 stays, 2050 becomes 1990)');

    const RT = await rp.evaluate(async () => {
      const E = HS.E, U = HS.ui; E.reset(); E.S().welcomed = true; U.closeSheet();
      U.gymSheet(); U.act.liftStart(); U.act.set('0:0');
      U.sh.rest.end = Date.now() + 59500;
      await new Promise(r => setTimeout(r, 400));
      const t = document.querySelector('#restT').textContent; U.closeSheet(); return t;
    });
    ok(RT === '1:00', 'the rest timer shows 1:00, not 0:00, in the first second after a minute (' + RT + ')');

    const HT = await rp.evaluate(async () => {
      const E = HS.E, U = HS.ui; E.reset(); E.S().welcomed = true; U.closeSheet(); E.day().reh = null;
      U.rehabSheet(); U.act.rguide();
      const g = U.sh.g, idx = g.list.findIndex(it => /sec\s*[×x]\s*\d+$/.test(it.rx.trim()) && !/reps?/i.test(it.rx));
      if (idx < 0) return { skip: true };
      while (g.i < idx) U.act.gskip();
      const base = window.__live.size;
      U.act.gset();   /* starts a hold timer */
      const during = window.__live.size;
      U.closeSheet();
      await new Promise(r => setTimeout(r, 500));
      return { base: base, during: during, after: window.__live.size };
    });
    ok(HT.skip || (HT.during === HT.base + 1 && HT.after < HT.during), 'the hold timer stops when the sheet closes (timers alive: ' + HT.base + ', ' + HT.during + ', ' + HT.after + ')');

    const EL = await rp.evaluate(() => {
      const E = HS.E, U = HS.ui; E.reset(); E.S().welcomed = true; E.cfg().goalW = 90; U.closeSheet(); U.tab = 'path'; U.render(true);
      const t = document.querySelector('#screen').innerHTML; E.reset(); U.tab = 'home'; U.render(true); return { bad: /NaN|undefined/.test(t) };
    });
    ok(!EL.bad, 'a goal at or above the starting weight does not break the Path screen');
    ok(rp.errs.length === 0, 'no console errors in the rules checks ' + JSON.stringify(rp.errs));
  }

  {
    /* the rest pass belongs to the week of the missed day, and a Chill day is settled for good */
    const mkSave = strict => `() => { const st = { v: 5, cfg: { name: 'X', strict: '${strict}' }, welcomed: true, start: '2026-09-20', aura: 500, weights: {}, cycles: [{ a: '2026-10-04', i: 0 }], cycle: { a: '2026-10-04', i: 0 }, days: {}, swept: { '2026-10-02': 1, '2026-10-03': 1 } }; if (!localStorage.getItem('habitsync.proto.v4')) localStorage.setItem('habitsync.proto.v4', JSON.stringify(st)); }`;
    const pp = await mk(eval(mkSave('standard')));
    await pp.goto(url); await pp.waitForTimeout(1000);
    const PW = await pp.evaluate(() => { const S = HS.E.S(); return { used: Object.keys(S.passUsed).join(), thisWeek: HS.E.passLeft(), aura: S.aura, fat: HS.E.fatigued(), w: (S.days['2026-10-04'] || {}).workout }; });
    ok(PW.used === '2026-09-28' && PW.thisWeek && PW.aura === 500 && !PW.fat && PW.w === 'pass', 'on Monday, a missed Sunday uses last week\'s pass and leaves this week\'s intact');
    ok(pp.errs.length === 0, 'no console errors ' + JSON.stringify(pp.errs));

    const cp = await mk(eval(mkSave('chill')));
    await cp.goto(url); await cp.waitForTimeout(1000);
    const CH = await cp.evaluate(() => { const E = HS.E, S = E.S(); S.cfg.strict = 'standard'; const out = E.sweep(); return { n: out.length, aura: S.aura, fat: E.fatigued(), sw: Object.keys(S.swept).length }; });
    ok(CH.n === 0 && CH.aura === 500 && !CH.fat && CH.sw >= 3, 'switching from Chill to Standard never punishes the days that passed under Chill');
  }

  {
    const dst = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/New_York' });
    await dst.addInitScript(pin, '2026-03-08T12:20:00');
    const dp = await dst.newPage(); dp.errs = [];
    dp.on('pageerror', e => dp.errs.push('PAGEERR ' + e.message));
    await dp.goto(url); await dp.waitForTimeout(700);
    const nm = await dp.evaluate(() => HS.E.nowMin());
    ok(nm === 740, 'minutes since midnight come from the wall clock, so a daylight-saving day is not an hour off (' + nm + ')');
    await dst.close();
  }

  {
    const ha = await mk(() => {
      window.__q = 0;
      window.Capacitor = { isNativePlatform: () => true, Plugins: { Health: {
        isAvailable: async () => ({ available: true }), requestAuthorization: async o => ({ readAuthorized: o.read }),
        queryAggregated: async () => { window.__q++; return { samples: [{ value: 4321 }] }; },
        readSamples: async () => ({ samples: [] }), queryWorkouts: async () => ({ workouts: [] }) } } };
      const st = { v: 5, cfg: { name: 'X' }, welcomed: true, aura: 5, health: { on: true, last: 0 } };
      if (!localStorage.getItem('habitsync.proto.v4')) localStorage.setItem('habitsync.proto.v4', JSON.stringify(st));
    });
    await ha.goto(url); await ha.waitForTimeout(1300);
    ok(await ha.evaluate(() => window.__q > 0 && HS.E.day().steps === '4321'), 'Samsung Health refreshes by itself when the app opens');
    ok(ha.errs.length === 0, 'no console errors with the automatic Samsung Health refresh ' + JSON.stringify(ha.errs));
  }

  {
    /* the phone's Back button must close a sheet, never leave the app, even when a sheet opens right as the delayed Back fires */
    const bad = [];
    for (let gap = 116; gap <= 130; gap += 2) {
      const hc = await b.newContext({ viewport: { width: 390, height: 844 } });
      const hp2 = await hc.newPage();
      await hp2.goto(url); await hp2.waitForTimeout(450);
      await hp2.evaluate(async g => {
        HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.weighSheet();
        await new Promise(r => setTimeout(r, 250)); HS.ui.closeSheet();
        await new Promise(r => setTimeout(r, g)); HS.ui.weighSheet();
      }, gap);
      await hp2.waitForTimeout(900);
      await hp2.goBack().catch(() => null); await hp2.waitForTimeout(400);
      let open = 'navigated-away';
      try { open = await hp2.evaluate(() => document.querySelector('#sheet').classList.contains('on')); } catch (e) { /* the page is gone */ }
      if (open !== false) bad.push(gap + 'ms:' + open);
      await hc.close();
    }
    ok(bad.length === 0, 'Back closes a sheet that opened at any moment around the delayed Back ' + JSON.stringify(bad));
  }

  {
    /* a backup copied as text (the only option inside embedded viewers) can be pasted into another copy of the app */
    const cp1 = await mk();
    await cp1.goto(url); await cp1.waitForTimeout(700);
    await cp1.evaluate(`(${seedSrc})(20)`);
    const srcAura = await cp1.evaluate(() => HS.E.S().aura);
    const text = await cp1.evaluate(() => HS.E.backupText());
    const cp2 = await mk();
    await cp2.goto(url); await cp2.waitForTimeout(700);
    await cp2.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.tab = 'forge'; HS.ui.render(true); }); await cp2.waitForTimeout(400);
    await cp2.click('[data-a="bkPaste"]'); await cp2.fill('#pasteBk', text);
    await cp2.click('[data-a="bkPasteGo"]'); await cp2.waitForTimeout(150);
    ok(await cp2.evaluate(() => Object.keys(HS.E.S().days).length) < 3, 'pasting backup text needs a deliberate second tap');
    await cp2.waitForTimeout(900); await cp2.click('[data-a="bkPasteGo"]'); await cp2.waitForTimeout(500);
    const got = await cp2.evaluate(() => ({ days: Object.keys(HS.E.S().days).length, aura: HS.E.S().aura, name: HS.E.S().cfg.name }));
    ok(got.days >= 20 && got.aura === srcAura && got.name === 'HUNTER', 'pasted backup text restores the whole save (' + got.days + ' days)');
    await cp2.evaluate(() => { HS.ui.tab = 'forge'; HS.ui.render(true); }); await cp2.waitForTimeout(300);
    const a0 = await cp2.evaluate(() => HS.E.S().aura);
    await cp2.click('[data-a="bkPaste"]'); await cp2.fill('#pasteBk', 'not a backup'); await cp2.click('[data-a="bkPasteGo"]'); await cp2.waitForTimeout(1000); await cp2.click('[data-a="bkPasteGo"]'); await cp2.waitForTimeout(400);
    ok(await cp2.evaluate(a => /not a Habit Sync backup/i.test(document.querySelector('#sysT').textContent) && HS.E.S().aura === a, a0), 'wrong text is refused and nothing is lost');
    ok(cp1.errs.length === 0 && cp2.errs.length === 0, 'no console errors with pasted restore ' + JSON.stringify(cp1.errs.concat(cp2.errs)));
  }

  /* ---------- second review: regressions and edge cases ---------- */
  {
    /* an older save with a single training anchor keeps its week (the first fix once reset it to Push) */
    const lc = await mk(() => { const st = { v: 5, cfg: { name: 'X' }, welcomed: true, start: '2026-09-20', aura: 500, cycle: { a: '2026-09-28', i: 1 }, days: {}, swept: { '2026-10-02': 1, '2026-10-03': 1, '2026-10-04': 1 } }; if (!localStorage.getItem('habitsync.proto.v4')) localStorage.setItem('habitsync.proto.v4', JSON.stringify(st)); });
    await lc.goto(url); await lc.waitForTimeout(900);
    const lr = await lc.evaluate(() => ({ today: HS.E.planFor(), sat: HS.E.planFor('2026-10-03'), a: HS.E.S().cycle.a, passes: Object.keys(HS.E.S().passUsed).length, aura: HS.E.S().aura }));
    ok(lr.today === 'Pull' && lr.sat === 'Rest' && lr.a === '2026-09-28' && lr.passes === 0 && lr.aura === 500, 'an older save keeps its training week (Pull today, Rest on Saturday) and no pass is burned');
    const im = await lc.evaluate(() => { HS.E.importText(JSON.stringify({ app: 'habit-sync', version: 5, state: { v: 5, cfg: { name: 'OLD' }, start: '2026-09-20', cycle: { a: '2026-09-29', i: 5 }, days: {} } })); return HS.E.planFor('2026-09-29'); });
    ok(im === 'Legs', 'a backup file written before the cycle anchors existed restores its training week');
    ok(lc.errs.length === 0, 'no console errors ' + JSON.stringify(lc.errs));
  }
  {
    const qa = await mk();
    await qa.goto(url); await qa.waitForTimeout(800);
    await qa.evaluate(() => { HS.E.reset(); HS.E.S().welcomed = true; HS.ui.closeSheet(); });
    const QB = await qa.evaluate(() => {
      const E = HS.E, U = HS.ui; U.plateSheet('lunch');
      const add = t => { document.querySelector('#mIn').value = t; U.act.mAdd(); };
      const k = () => Math.round(E.mealKcal(E.day(), 'lunch')), toast = () => document.querySelector('#sysT').textContent;
      add('momos 350'); const a = k();
      add('momos 350'); const b = k();
      add('0 g'); const c = k(), t1 = toast();
      add('300 kcal'); const t2 = toast();
      add('rice 0g'); const t3 = toast(), d = k();
      U.closeSheet(); return { a: a, db: b - a, c: c - b, t1: t1, t2: t2, t3: t3, d: d - c };
    });
    ok(Math.abs(QB.a - 350) <= 10 && Math.abs(QB.db - 350) <= 10, 'a bare number after a custom food is kcal every time, not grams the second time (' + QB.a + ', +' + QB.db + ')');
    ok(QB.c === 0 && /Add a name/.test(QB.t1) && /Add a name/.test(QB.t2) && QB.d === 0 && /zero/.test(QB.t3), 'a missing name or a zero amount is refused with a reason');
  }
  {
    const zs = await mk(() => {
      window.Capacitor = { isNativePlatform: () => true, Plugins: { Health: {
        isAvailable: async () => ({ available: true }), requestAuthorization: async o => ({ readAuthorized: o.read }),
        queryAggregated: async () => ({ samples: [{ value: 0 }] }), readSamples: async () => ({ samples: [] }), queryWorkouts: async () => ({ workouts: [] }) } } };
      const st = { v: 5, cfg: { name: 'X' }, welcomed: true, aura: 5, health: { on: true, last: 0 } };
      if (!localStorage.getItem('habitsync.proto.v4')) localStorage.setItem('habitsync.proto.v4', JSON.stringify(st));
    }, '2026-10-10T06:10:00');   /* a day where the automatic bonus quest is "log your steps" */
    await zs.goto(url); await zs.waitForTimeout(1300);
    const zr = await zs.evaluate(() => { const d = HS.E.day(), S = HS.E.S(); return { steps: d.steps, h: d.hSteps, ids: HS.E.bonusToday().map(b => b.id).join(), claimed: Object.keys(S.claimed).filter(k => /^bonus:/.test(k)).length, goal: HS.E.goalHave({ id: 'g_steps' }) }; });
    ok(zr.h === 0 && !zr.steps && zr.claimed === 0 && zr.goal === 0, 'a Samsung sync that reads 0 steps does not count as a logged day (' + zr.ids + ')');
  }
  {
    const wq = await mk();
    await wq.goto(url); await wq.waitForTimeout(800);
    await wq.evaluate(() => { HS.E.reset(); HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.weighSheet(); }); await wq.waitForTimeout(500);
    await wq.fill('#wIn', '70.0'); await wq.click('[data-a="wSave"]'); await wq.waitForTimeout(300);
    const w1 = await wq.evaluate(() => ({ n: Object.keys(HS.E.S().weights).length, toast: document.querySelector('#sysT').textContent, open: document.querySelector('#sheet').classList.contains('on') }));
    ok(w1.n === 0 && w1.open && /Tap Save again/.test(w1.toast), 'a weigh-in 14 kg off the last reading asks once before it is saved');
    await wq.click('[data-a="wSave"]'); await wq.waitForTimeout(400);
    ok(await wq.evaluate(() => Object.keys(HS.E.S().weights).length) === 1, 'the second tap saves it');
    const hid = await wq.evaluate(async () => { HS.ui.closeSheet(); const sh = document.querySelector('#sheet'); for (let i = 0; i < 40 && getComputedStyle(sh).visibility !== 'hidden'; i++) await new Promise(r => setTimeout(r, 50)); const before = Object.keys(HS.E.S().weights).length; let thrown = ''; try { HS.ui.act.wSave(); } catch (e) { thrown = e.message; } return { vis: getComputedStyle(sh).visibility, thrown: thrown, same: Object.keys(HS.E.S().weights).length === before }; });
    ok(hid.vis === 'hidden' && hid.thrown === '' && hid.same, 'a closed sheet is hidden from focus and screen readers, and its Save does nothing ' + JSON.stringify(hid));
    const nl = await wq.evaluate(() => { HS.E.S().welcomed = true; const n = HS.E.S(); n.cfg.name = 'WWWWWWWWWWWWWW'; HS.ui.tab = 'home'; HS.ui.render(true); const who = document.querySelector('.who').getBoundingClientRect(), aur = document.querySelector('.aur').getBoundingClientRect(); return who.right <= aur.left + 1; });
    ok(nl, 'a 14-letter wide name stays clear of the aura counter');
  }
  {
    const bf = await mk();
    await bf.goto(url); await bf.waitForTimeout(800);
    const BF = await bf.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; const today = E.dkey(), y = E.addDays(today, -1);
      S.start = E.addDays(today, -5);
      E.day(y).reh = { items: {}, day: 0, knee: 7, back: 0, sharp: false, done: true, n: 5, checked: true };   /* yesterday was red */
      const ids1 = E.bonusToday().map(b => b.id).join();
      const m = E.bonusToday().find(b => !b.auto); E.tickBonus(m.id);
      E.day().reh = { items: {}, day: 0, knee: 0, back: 0, sharp: false, done: true, n: 5, checked: true };   /* a green check-in at noon */
      const ids2 = E.bonusToday().map(b => b.id).join();
      return { ids1: ids1, ids2: ids2, ticked: E.bonusToday().find(b => b.id === m.id).done };
    });
    ok(BF.ids1 === BF.ids2 && BF.ticked, 'the three bonus quests are frozen for the day: a later check-in cannot swap one you already ticked');
  }
  {
    const ro = await mk(null, '2026-10-05T23:40:00');
    await ro.goto(url); await ro.waitForTimeout(900);
    await ro.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.E.S().start = HS.E.addDays(HS.E.dkey(), -3); HS.ui.rehabSheet(); }); await ro.waitForTimeout(400);
    await ro.evaluate(pin, '2026-10-06T07:30:00');
    const RO = await ro.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); const closed = !HS.ui.sh && !document.querySelector('#sheet').classList.contains('on'); let thrown = ''; try { HS.ui.rehabSheet(); HS.ui.act.rguide(); HS.ui.closeSheet(); } catch (e) { thrown = e.message; } return { closed: closed, day: HS.E.dkey(), thrown: thrown }; });
    ok(RO.closed && RO.day === '2026-10-06' && RO.thrown === '', 'a sheet left open overnight is closed when the new day starts, and rehab opens cleanly');
  }
  {
    const sc = await mk();
    await sc.goto(url); await sc.waitForTimeout(800);
    const SC = await sc.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; const today = E.dkey();
      S.start = E.addDays(today, -10); S.cycles = [{ a: S.start, i: 0 }]; S.cycle = { a: S.start, i: 0 };
      const week = () => { const o = []; for (let i = 0; i < 7; i++) o.push(E.planFor(E.addDays(today, i))); return o.join(); };
      const w0 = week(), p0 = E.planFor(), other = p0 === 'Pull' ? 'Legs' : 'Pull';
      E.setSession(other); const w1 = week(); E.setSession(p0); const w2 = week();
      S.cycles.push({ a: E.addDays(today, 2), i: 0 }); E.setSession(other);
      return { w0: w0, w2: w2, changed: w1 !== w0, future: S.cycles.filter(c => c.a > today).length, cyc: S.cycle.a <= today };
    });
    ok(SC.changed && SC.w0 === SC.w2, 'a mis-tap on the session picker followed by the right session leaves the week exactly as it was');
    ok(SC.future === 0 && SC.cyc, 'an anchor dated in the future (clock set back) is dropped on the next correction');
    const CH = await sc.evaluate(async () => {
      const E = HS.E, U = HS.ui; E.reset(); E.S().welcomed = true; U.closeSheet(); U.clearCele(); E.day().closed = true; E.day().score = 3;
      let n = 0; const oc = U.cele; U.cele = c => { n++; return oc.call(U, c); };
      U.act.chestOpen(); await new Promise(r => setTimeout(r, 120)); U.act.chestOpen();
      await new Promise(r => setTimeout(r, 1500)); U.cele = oc; U.clearCele();
      return { n: n, aura: E.day().chest && E.day().chest.aura > 0 };
    });
    ok(CH.n === 2 && CH.aura, 'a second tap on the chest does not replay the reveal (' + CH.n + ' cards)');
  }
  {
    const rm = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await rm.addInitScript(pin, '2026-10-05T12:30:00');
    const rp2 = await rm.newPage(); rp2.errs = [];
    rp2.on('pageerror', e => rp2.errs.push('PAGEERR ' + e.message));
    await rp2.goto(url); await rp2.waitForTimeout(700);
    const RM = await rp2.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.E.logWeight(83.9); HS.ui.justRow = 'weigh'; HS.ui.render(); const p = document.querySelector('.qrow.just .qic svg path'); return p ? getComputedStyle(p).strokeDashoffset : 'none'; });
    ok(RM === '0px', 'with "remove animations" on, the tick on a finished quest is still drawn (' + RM + ')');
    await rm.close();
  }
  {
    const pc = await mk();
    await pc.goto(url); await pc.waitForTimeout(800);
    const PC = await pc.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; const today = E.dkey(); S.start = E.addDays(today, -20);
      for (let i = 19; i >= 0; i--) S.weights[E.addDays(today, -i)] = 84 + (20 - i) * .6;   /* weight going UP */
      HS.ui.closeSheet(); HS.ui.tab = 'path'; HS.ui.render(true);
      const dots = [...document.querySelectorAll('circle.cd')].map(c => +c.getAttribute('cy'));
      return { n: dots.length, inside: dots.every(y => y >= 0 && y <= 170) };
    });
    ok(PC.n > 10 && PC.inside, 'the plan chart keeps every weigh-in inside the frame when the weight goes up');
  }
  {
    const nq = await mk(() => {
      window.__order = [];
      window.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: {
        checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }), createChannel: async () => {},
        getPending: async () => ({ notifications: [{ id: 5 }, { id: 6 }] }),
        cancel: async o => { window.__order.push(['cancel', o.notifications.map(n => n.id)]); },
        schedule: async o => { window.__order.push(['schedule', o.notifications.map(n => n.id)]); } } } };
      const st = { v: 5, cfg: { name: 'X' }, welcomed: true, aura: 5, remind: { on: true } };
      if (!localStorage.getItem('habitsync.proto.v4')) localStorage.setItem('habitsync.proto.v4', JSON.stringify(st));
    });
    await nq.goto(url); await nq.waitForTimeout(800);
    await nq.evaluate(() => HS.notify.schedule()); await nq.waitForTimeout(400);
    const NQ = await nq.evaluate(() => window.__order);
    ok(NQ.length >= 2 && NQ[0][0] === 'schedule' && NQ[0][1].length > 30 && NQ[1][0] === 'cancel' && NQ[1][1].join() === '5,6', 'reminders are scheduled first and only the stale ones are cancelled afterwards, so the phone is never left with none');
  }

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  await b.close();
  process.exit(failed ? 1 : 0);
})();
