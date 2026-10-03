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
    pg.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|favicon/.test(m.text())) pg.errs.push(m.text()); });
    pg.on('pageerror', e => pg.errs.push('PAGEERR ' + e.message));
    return pg;
  };
  const clr = pg => pg.evaluate(() => { HS.ui.clearCele(); document.getElementById('sys').className = ''; });
  const pg = await mk();
  await pg.goto(url); await pg.waitForTimeout(900);

  /* ---------- first run: the awakening ---------- */
  ok(await pg.evaluate(() => document.querySelector('#shT').textContent === 'Awakening' && document.querySelector('#sheet').classList.contains('on')), 'first run opens the Awakening sheet');
  await pg.screenshot({ path: out + 'a0-welcome.png' });
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
      lv2: E.LVF(2), rkE: E.rankOf(7), rkD: E.rankOf(8), burn: E.burnEst(84, 60, 15, 10), items: HS.ITEMS.length, realms: HS.REALMS.length,
      parse: [E.parsePart('rice 200g').g, E.parsePart('2 chapati').units, E.parsePart('chicken 150').tn, E.parsePart('momos 350 kcal').kc] };
  });
  ok(R.lad === 28 && R.bosses === '80,76,72,70', 'gate ladder to 70 kg: 28 gates, bosses at 80, 76, 72, 70');
  ok(R.weeks === 31 && R.camps === 3 && R.finish === R.expFinish, 'campaign plan: 31 weeks including 3 camp weeks, finish ' + R.finish);
  ok(R.exp0 === 84 && R.k84 === 2050 && R.k80 === 1990, 'plan starts at 84 kg; calories step from 2050 to 1990 at the first boss');
  ok(R.lv2 === 200 && R.rkE === 'E' && R.rkD === 'D', 'level 2 needs 200 aura, rank D starts at level 8');
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
  await pg.click('[data-a="gymNext"]'); await pg.waitForTimeout(900);
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

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  await b.close();
  process.exit(failed ? 1 : 0);
})();
