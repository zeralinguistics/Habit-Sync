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
    pg.setDefaultTimeout(4000);
    /* an action that cannot find its element is a failed check, not a crash, so one broken screen does not hide the rest */
    ['click', 'fill', 'press', 'setInputFiles'].forEach(m => { const o = pg[m].bind(pg); pg[m] = async (...a) => { try { return await o(...a); } catch (e) { ok(false, 'action ' + m + ' ' + a[0] + ': ' + e.message.split('\n')[0]); } }; });
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
  await pg.click('.fadd >> nth=0'); await pg.waitForTimeout(150);
  await pg.click('.fadd >> nth=3'); await pg.waitForTimeout(700);   /* salad and pappad: the typed rice and chapati below must not meet a tile of their own */
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
  await pg.click('[data-a="ptab:mine"]'); await pg.waitForTimeout(300);
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
  const GN = await pg.evaluate(() => HS.ui.sh.g.list.length);
  ok(await pg.evaluate(n => !!document.querySelector('.gd svg.fig.big') && new RegExp('1 / ' + n).test(document.querySelector('.gtop span').textContent), GN) && GN === 13, 'guided session opens at step 1 of 13: 11 moves, and knee to chest and the Pallof press each count once per side');
  ok(await pg.evaluate(() => { const l = HS.ui.sh.g.list, kc = l.filter(x => x.key === 'b1'); return kc.length === 2 && kc[0].side === 'L' && kc[1].side === 'R' && /30 sec/.test(kc[0].rx); }), 'knee to chest is 30 seconds on the left leg, then on the right leg');
  await pg.screenshot({ path: out + 'a7-guide.png' });
  /* skip timer waits: stub the hold length by completing each move through its own set button */
  for (let i = 0; i < GN; i++) {
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
  ok(await pg.evaluate(() => !!document.querySelector('.jchartc svg') && !!document.querySelector('.jplan') && !!document.querySelector('.jh1 svg') && !!document.querySelector('#road')), 'the journey shows the descent chart with the plan line, the final-form silhouette and the gate road');
  await pg.evaluate(() => HS.ui.act.campaign()); await pg.waitForTimeout(600);
  ok(await pg.evaluate(() => document.querySelectorAll('.rc2').length === 5 && /28/.test(document.querySelector('#shBody .dis').textContent)), 'campaign sheet lists four realms plus the final form and 28 gates');
  await pg.screenshot({ path: out + 'b5-campaign.png' });
  await pg.evaluate(() => HS.ui.closeSheet());
  await pg.evaluate(() => HS.ui.act.streaks()); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => document.querySelectorAll('#shBody .pil').length === 6 && document.querySelectorAll('#shBody .mgrid .mc').length >= 28 && /Streak shields/.test(document.querySelector('#shBody').textContent)), 'the streak sheet shows six pillars, the month calendar and the shields');
  await pg.evaluate(() => HS.ui.act.goalsOpen()); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => document.querySelectorAll('.gl2').length >= 11), 'goals and rewards lists five weekly goals and seven streaks');
  await pg.evaluate(() => HS.ui.closeSheet());

  /* ---------- forge: customise ---------- */
  await pg.evaluate(() => HS.ui.act.tab('forge')); await pg.waitForTimeout(700);
  await pg.click('[data-a="help"]'); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => /Aura and levels/.test(document.querySelector('#shBody').textContent) && /camp week/i.test(document.querySelector('#shBody').textContent)), 'the Forge explains how the game works in plain words');
  await pg.screenshot({ path: out + 'b5b-help.png' });
  await pg.evaluate(() => HS.ui.closeSheet()); await pg.waitForTimeout(300);
  await pg.evaluate(() => HS.ui.act.set_('rules')); await pg.waitForTimeout(500);
  await pg.click('[data-a="roast:off"]'); await pg.waitForTimeout(200);
  ok((await S(pg)).cfg.roast === 'off' && await pg.evaluate(() => HS.say('roast', 'skip', 'off') === ''), 'teasing can be switched off');
  await pg.click('[data-a="roast:playful"]');
  await pg.evaluate(() => { HS.ui.closeSheet(); HS.ui.act.set_('targets'); }); await pg.waitForTimeout(500);
  await pg.fill('[data-cfg="kcal"]', '2200');
  ok(await pg.evaluate(() => HS.E.cfg().kcal === 2200), 'settings change the calorie target live');
  await pg.fill('[data-cfg="kcal"]', '1990');
  await pg.evaluate(() => { HS.ui.closeSheet(); HS.ui.act.set_('look'); }); await pg.waitForTimeout(500);
  await pg.click('[data-a="theme:ember"]'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() === '#ff8a3d'), 'a fixed theme overrides the realm');
  await pg.click('[data-a="theme:auto"]'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() === '#a678ff'), '"My realm" follows the realm again');
  await pg.screenshot({ path: out + 'b6-forge.png' });
  await pg.evaluate(() => { HS.ui.closeSheet(); HS.ui.act.set_('backup'); }); await pg.waitForTimeout(500);

  /* ---------- the data vault ---------- */
  const backup = await pg.evaluate(() => HS.E.backupText());
  ok(/"app":"habit-sync"/.test(backup) && backup.length > 500, 'backup text is produced (' + backup.length + ' bytes)');
  const before = await S(pg);
  await pg.evaluate(() => { HS.E.S().aura = 1; HS.E.save(); });
  await pg.setInputFiles('#restoreFile', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(backup) }); await pg.waitForTimeout(600);
  ok((await S(pg)).aura === before.aura, 'restoring from a backup file brings the state back exactly');
  await pg.evaluate(() => { HS.ui.closeSheet(); HS.ui.act.set_('backup'); }); await pg.waitForTimeout(500);
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
  ok(await pg.evaluate(() => /day streak/.test(document.querySelector('#screen').textContent) && !!document.querySelector('#skCard') && document.querySelectorAll('.skd').length === 7), 'home shows the streak card with the last seven days on seeded history');

  /* ---------- a day that ends at 3 am, for someone who goes to bed after midnight ---------- */
  const lp = await mk(null, '2026-10-06T01:10:00');
  await lp.goto(url); await lp.waitForTimeout(800);
  await lp.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.render(true); }); await lp.waitForTimeout(500);
  const L1 = await lp.evaluate(() => ({ k: HS.E.dkey(), m: HS.E.nowMin(), sit: HS.E.situation(), hdr: (document.querySelector('#screen').textContent.match(/closes in [0-9]+h [0-9]+m/) || [''])[0] }));
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
  await hp.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.act.tab('forge'); HS.ui.act.set_('samsung'); }); await hp.waitForTimeout(600);
  ok(await hp.evaluate(() => /Connect Samsung Health/.test(document.querySelector('#shBody').textContent)), 'the Android app offers to connect Samsung Health');
  const cn = await hp.evaluate(async () => { const r = await HS.health.connect(); return r; });
  ok(cn.ok && (await hp.evaluate(() => window.__calls[0][1].join())) === 'steps,distance,calories,sleep,weight,workouts,restingHeartRate,heartRate,flightsClimbed', 'connect asks for read-only steps, distance, calories, sleep, weight, workouts, heart rate and floors, and never for write access');
  ok(await hp.evaluate(() => window.__calls[0].length === 2 && !!HS.health.types.length), 'the permission request is read-only');
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
  await np.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.act.tab('forge'); HS.ui.act.set_('remind'); }); await np.waitForTimeout(500);
  await np.click('[data-a="remind:1"]'); await np.waitForTimeout(900);
  const sc = await np.evaluate(() => ({ n: window.__sched.length ? window.__sched[window.__sched.length - 1].length : 0, first: window.__sched.length ? window.__sched[window.__sched.length - 1][0] : null, on: HS.E.S().remind.on }));
  ok(sc.on && sc.n >= 60 && sc.first && sc.first.isExactNotification === false, 'reminders schedule ' + sc.n + ' friendly nudges over 14 days, inexact so no special permission is needed');
  ok(np.errs.length === 0, 'no console errors with reminders ' + JSON.stringify(np.errs));

  /* ---------- bonus quests: three small optional extras a day ---------- */
  const bq = await mk();
  await bq.goto(url); await bq.waitForTimeout(800);
  await bq.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.tab = 'home'; HS.ui.render(true); HS.E.rng = () => .5; HS.ui.act.bonusSheet(); }); await bq.waitForTimeout(1300);
  const b0 = await bq.evaluate(() => {
    const E = HS.E, r = E.bonusToday(), r2 = E.bonusToday(), sets = new Set();
    for (let i = 0; i < 12; i++) sets.add(E.bonusToday(E.addDays(E.dkey(), i)).map(x => x.id).join());
    return { ids: r.map(x => x.id), same: r.map(x => x.id).join() === r2.map(x => x.id).join(), autos: r.filter(x => x.auto).length, varied: sets.size, rows: document.querySelectorAll('#bonusRows .brow').length };
  });
  ok(b0.ids.length === 3 && b0.autos === 1 && b0.same && b0.varied >= 4 && b0.rows === 3, 'three bonus quests a day (one ticks itself, two you tick), stable through the day, different across days: ' + b0.ids.join());
  const mrow = await bq.evaluate(() => HS.E.bonusToday().find(x => !x.auto));
  const aura0 = (await S(bq)).aura;
  const sel = id => '#bonusRows [data-a="bonus:' + id + '"]';
  await bq.click(sel(mrow.id)); await bq.waitForTimeout(400);
  const b1 = await bq.evaluate(id => ({ aura: HS.E.S().aura, done: document.querySelector('#bonusRows [data-a="bonus:' + id + '"]').classList.contains('done'), n: HS.E.S().counters.bonus }), mrow.id);
  ok(b1.aura === aura0 + mrow.a && b1.done && b1.n === 1, 'ticking a bonus quest pays its aura once (+' + mrow.a + ') and shows it done');
  await bq.click(sel(mrow.id)); await bq.waitForTimeout(250); await bq.click(sel(mrow.id)); await bq.waitForTimeout(300);
  const b2 = await bq.evaluate(id => ({ aura: HS.E.S().aura, n: HS.E.S().counters.bonus, done: document.querySelector('#bonusRows [data-a="bonus:' + id + '"]').classList.contains('done') }), mrow.id);
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
  const b3 = await bq.evaluate(id => ({ aura: HS.E.S().aura, claimed: !!HS.E.S().claimed['bonus:' + HS.E.dkey() + ':' + id], n: HS.E.S().counters.bonus, toast: document.querySelector('#sysT').textContent, done: document.querySelector('#bonusRows [data-a="bonus:' + id + '"]').classList.contains('done') }), au.id);
  ok(b3.claimed && b3.done && b3.n === 2 && b3.aura >= au.aura + au.a && /Bonus quest done/.test(b3.toast), 'the self-ticking bonus pays when the data says so (' + au.id + ') and the card updates without a re-render');
  const other = await bq.evaluate(() => HS.E.bonusToday().find(x => !x.auto && !x.done));
  const aura1 = (await S(bq)).aura;
  await bq.click(sel(other.id)); await bq.waitForTimeout(500);
  const b4 = await bq.evaluate(() => ({ aura: HS.E.S().aura, all: !!HS.E.day().bonusAll, set: /3 of 3/.test(document.querySelector('#bonusHd').textContent), toast: document.querySelector('#sysT').textContent }));
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
    HS.ui.closeSheet(); await new Promise(r => setTimeout(r, 700));
    HS.ui.tab = 'home'; HS.ui.render(); await new Promise(r => setTimeout(r, 120));
    const plain = document.getAnimations().filter(a => a.animationName === 'rise' && a.effect.target.closest('#screen')).length;
    HS.ui.render(true); await new Promise(r => setTimeout(r, 120));
    return { plain: plain, full: document.getAnimations().filter(a => a.animationName === 'rise' && a.effect.target.closest('#screen')).length };
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
  await rs.evaluate(() => { HS.ui.closeSheet(); HS.ui.clearCele(); HS.ui.tab = 'forge'; HS.ui.render(true); HS.ui.act.set_('backup'); }); await rs.waitForTimeout(600);
  const days0 = await rs.evaluate(() => Object.keys(HS.E.S().days).length);
  await rs.click('#resetBtn'); await rs.waitForTimeout(60); await rs.click('#resetBtn'); await rs.waitForTimeout(200);
  ok(await rs.evaluate(() => Object.keys(HS.E.S().days).length) === days0, 'an instant double tap on Reset does nothing');
  await rs.waitForTimeout(900); await rs.click('#resetBtn'); await rs.waitForTimeout(500);
  ok(await rs.evaluate(() => Object.keys(HS.E.S().days).length) < 3, 'a deliberate second tap resets');
  const und = await rs.evaluate(() => HS.E.undoInfo());
  ok(und && und.days >= days0 - 1, 'the old state is kept aside for an undo (' + (und && und.days) + ' days)');
  await rs.evaluate(() => { HS.ui.closeSheet(); HS.ui.clearCele(); HS.ui.act.set_('backup'); }); await rs.waitForTimeout(600);
  ok(await rs.evaluate(() => /Undo last reset or restore/.test(document.querySelector("#vaultWrap").textContent)), 'the Data vault offers the undo');
  const back = await rs.evaluate(() => { HS.E.reset(); return HS.E.undoLast(); });
  ok(back >= days0 - 1, 'undo brings everything back, even after a second reset (' + back + ' days)');
  ok(rs.errs.length === 0, 'no console errors around reset and undo ' + JSON.stringify(rs.errs));

  const cb = await mk(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => window.__clipOk ? Promise.resolve() : Promise.reject(new Error('denied')) }, configurable: true }); document.execCommand = () => false; });   /* headless Chromium lets execCommand('copy') succeed with no user gesture; a real phone does not */
  await cb.goto(url); await cb.waitForTimeout(700);
  await cb.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.tab = 'forge'; HS.ui.render(true); HS.ui.act.set_('backup'); window.__clipOk = false; HS.ui.act.bkCopy(); }); await cb.waitForTimeout(500);
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
      const rot0 = S.rot.i, todayPlan = E.planFor(), target = todayPlan === 'Pull' ? 'Legs' : 'Pull';
      E.setSession(target);
      const past2 = []; for (let i = 14; i >= 1; i--) past2.push(E.planFor(E.addDays(today, -i)));
      HS.ui.closeSheet(); HS.ui.gymSheet();
      const rest = document.querySelectorAll('#shBody [data-a="sess:Rest"]').length;
      HS.ui.act.sess('Rest');
      const r = { same: past.join() === past2.join(), now: E.planFor(), target: target, rot: S.rot.i === rot0, anchors: S.cycles.length, rest: rest, stillTrain: E.planFor() === target };
      HS.ui.closeSheet(); return r;
    });
    ok(C.same && C.now === C.target && C.rot && C.anchors === 1, 'switching today\'s session never rewrites earlier days and never moves the rotation until you finish it');
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
      add('zorbo 350 kcal'); const k2 = Math.round(E.mealKcal(E.day(), 'lunch'));
      add('zorbo 500 kcal'); const k3 = Math.round(E.mealKcal(E.day(), 'lunch'));
      U.closeSheet(); return { k1: k1, d2: k2 - k1, d3: k3 - k2, ph: ph };
    });
    ok(Math.abs(QA.k1 - 400) <= 10 && Math.abs(QA.d2 - 350) <= 10 && Math.abs(QA.d3 - 500) <= 10 && QA.ph.length > 10, 'a typed kcal figure is honoured every time (400, +350, +500 kcal logged: ' + QA.k1 + ', ' + QA.d2 + ', ' + QA.d3 + ')');

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
    await cp2.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.tab = 'forge'; HS.ui.render(true); HS.ui.act.set_('backup'); }); await cp2.waitForTimeout(500);
    await cp2.click('[data-a="bkPaste"]'); await cp2.fill('#pasteBk', text);
    await cp2.click('[data-a="bkPasteGo"]'); await cp2.waitForTimeout(150);
    ok(await cp2.evaluate(() => Object.keys(HS.E.S().days).length) < 3, 'pasting backup text needs a deliberate second tap');
    await cp2.waitForTimeout(900); await cp2.click('[data-a="bkPasteGo"]'); await cp2.waitForTimeout(500);
    const got = await cp2.evaluate(() => ({ days: Object.keys(HS.E.S().days).length, aura: HS.E.S().aura, name: HS.E.S().cfg.name }));
    ok(got.days >= 20 && got.aura === srcAura && got.name === 'HUNTER', 'pasted backup text restores the whole save (' + got.days + ' days)');
    await cp2.evaluate(() => { HS.ui.closeSheet(); HS.ui.clearCele(); HS.ui.act.set_('backup'); }); await cp2.waitForTimeout(600);
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
      add('zorbo 350'); const a = k();
      add('zorbo 350'); const b = k();
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
      S.cycles.push({ a: E.addDays(today, 2), i: 0 }); let thrown = ''; try { E.setSession(other); } catch (e) { thrown = e.message; }
      return { w0: w0, w2: w2, changed: w1 !== w0, thrown: thrown, plan: E.planFor(), other: other };
    });
    ok(SC.changed && SC.w0 === SC.w2, 'a mis-tap on the session picker followed by the right session leaves the week exactly as it was');
    ok(SC.thrown === '' && SC.plan === SC.other, 'an old-style anchor dated in the future (clock set back) cannot break the session picker');
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
    const RM = await rp2.evaluate(() => { HS.E.S().welcomed = true; HS.ui.closeSheet(); HS.E.logWeight(83.9); HS.ui.justRow = 'weigh'; HS.ui.render(); const p = document.querySelector('.tl2.just .tli svg path'); return p ? getComputedStyle(p).strokeDashoffset : 'none'; });
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
      const dots = [...document.querySelectorAll('circle.jd')].map(c => +c.getAttribute('cy'));
      return { n: dots.length, inside: dots.every(y => y >= 0 && y <= 214) };
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

  {
    /* third review: a first install after midnight, silent gates, a slider after the day changed */
    const nf = await mk(null, '2026-10-06T01:00:00');
    await nf.goto(url); await nf.waitForTimeout(900);
    await nf.fill('#wName', 'Rin'); await nf.click('[data-a="wGo"]'); await nf.waitForTimeout(600);
    await nf.evaluate(() => { HS.ui.clearCele(); });
    const NF = await nf.evaluate(() => {
      const E = HS.E; const first = E.planFor(); let thrown = '';
      try { HS.ui.gymSheet(); HS.ui.act.sess('Pull'); } catch (e) { thrown = e.message; }
      const after = E.planFor(); let render = ''; try { HS.ui.closeSheet(); HS.ui.render(true); } catch (e) { render = e.message; }
      return { first: first, after: after, thrown: thrown, render: render, anchors: E.S().cycles.length, day: E.dkey() };
    });
    ok(NF.day === '2026-10-05' && NF.first === 'Push' && NF.after === 'Pull' && NF.thrown === '' && NF.render === '' && NF.anchors >= 1, 'a first install at 01:00 belongs to the day before, starts on Push, and correcting the session works (' + NF.first + ' to ' + NF.after + ')');
    ok(nf.errs.length === 0, 'no console errors on a first install after midnight ' + JSON.stringify(nf.errs));
    const FA = await nf.evaluate(() => {
      const E = HS.E, S = E.S(); const k = E.dkey(); S.cycles = [{ a: E.addDays(k, 3), i: 0 }]; S.cycle = { a: E.addDays(k, 3), i: 0 };
      let thrown = ''; try { E.setSession('Legs'); } catch (e) { thrown = e.message; }
      return { thrown: thrown, plan: E.planFor(), n: S.cycles.length };
    });
    ok(FA.thrown === '' && FA.plan === 'Legs' && FA.n === 1, 'when every training anchor lies in the future (clock set back), a correction restates one on today instead of crashing');

    const SG = await nf.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; S.startW = 84;
      for (let i = 1; i <= 20; i++) S.weights[E.addDays(E.dkey(), -i)] = 82.4;
      E.logWeight(82.4);
      const aura1 = S.aura, paid1 = Object.keys(S.gateDates).length;
      S.startW = 86; E.logWeight(82.4);
      return { aura1: aura1, aura2: S.aura, paid1: paid1, paid2: Object.keys(S.gateDates).length, listed: S.gates.length > paid1 };
    });
    ok(SG.aura2 === SG.aura1 && SG.paid2 === SG.paid1 && SG.listed, 'gates invented by editing the start weight pay nothing and carry no clear date, so the weekly "clear a gate" goal cannot be farmed');

    const SL = await nf.evaluate(async () => {
      const E = HS.E, U = HS.ui; E.reset(); E.S().welcomed = true; U.closeSheet();
      U.rehabSheet(); E.day().reh = null;   /* the day changed under the open sheet */
      const kr = document.querySelector('#kr'); kr.value = 7; kr.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 450));
      const saved = JSON.parse(localStorage.getItem('habitsync.proto.v4')).days[E.dkey()].reh;
      U.closeSheet(); return { knee: E.day().reh && E.day().reh.knee, saved: saved && saved.knee, light: E.lastLight() };
    });
    ok(SL.knee === 7 && SL.saved === 7 && SL.light === 'red', 'a pain slider moved after the day changed is recorded and saved (' + SL.knee + ')');
  }


  /* ---------- the training rotation: Push, Pull, Legs, Rest by what you finish, not by the weekday ---------- */
  {
    const rt = await mk();
    await rt.goto(url); await rt.waitForTimeout(800);
    const RO = await rt.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; const today = E.dkey(), nxt = () => E.ROT[E.S().rot.i], o = {};   /* E.reset() makes a new state object, so always ask for the current one */
      o.first = E.planFor();
      E.completeWorkout('Pull'); o.afterPull = nxt();      /* Pull was done although Push was due */
      E.day().workout = null; E.completeWorkout('Legs'); o.afterLegs = nxt();   /* a second session on the same day is only a test of the pointer */
      /* a rest day that passes moves the rotation on to Push */
      E.reset(); const T = E.S(); T.welcomed = true; T.start = E.keyOffset(-10); T.rot = { i: 3, from: today };
      T.swept = {}; T.swept[E.keyOffset(-3)] = 1; T.swept[E.keyOffset(-2)] = 1;
      const aura0 = T.aura; E.sweep();
      o.restPassed = nxt(); o.restAura = T.aura === aura0; o.restFat = E.fatigued();
      /* a Push that was missed is still Push, and the miss costs aura */
      E.reset(); const U2 = E.S(); U2.welcomed = true; U2.start = E.keyOffset(-10); U2.rot = { i: 0, from: today }; U2.aura = 500; U2.passUsed = { [E.weekKey()]: 1, [E.addDays(E.weekKey(), -7)]: 1 };   /* no pass left in either week, so the miss is a real one */
      U2.swept = {}; U2.swept[E.keyOffset(-3)] = 1; U2.swept[E.keyOffset(-2)] = 1;
      E.sweep(); o.missedStays = nxt(); o.missedAura = U2.aura < 500; o.yWork = (U2.days[E.keyOffset(-1)] || {}).workout;
      return o;
    });
    ok(RO.first === 'Push', 'a fresh start begins on Push');
    ok(RO.afterPull === 'Legs' && RO.afterLegs === 'Rest', 'the rotation follows the session you finished: Pull done, Legs is next; Legs done, Rest is next (' + RO.afterPull + ', ' + RO.afterLegs + ')');
    ok(RO.restPassed === 'Push' && RO.restAura && !RO.restFat, 'a rest day that passes moves on to Push and costs nothing');
    ok(RO.missedStays === 'Push' && RO.missedAura && RO.yWork === 'lazy', 'a missed Push stays due the next day (and the miss is settled once)');
    const RS = await rt.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; HS.ui.closeSheet();
      const base = E.planFor(); E.setSession('Legs'); const picked = E.planFor(); E.setSession(base); const back = E.planFor();
      S.rot.i = 3; E.day().sess = null; HS.ui.gymSheet(); const hasStart = !!document.querySelector('[data-a="liftStart"]'), hasCardio = !!document.querySelector('[data-a="cardioStart"]');
      HS.ui.act.sess('Rest'); HS.ui.closeSheet();
      return { base: base, picked: picked, back: back, hasStart: hasStart, hasCardio: hasCardio };
    });
    ok(RS.base === 'Push' && RS.picked === 'Legs' && RS.back === 'Push', 'today\'s session can be switched to what you really do, and switched back');
    ok(!RS.hasStart && RS.hasCardio, 'the Rest day offers cardio, not a lifting session');
    ok(rt.errs.length === 0, 'no console errors in the rotation checks ' + JSON.stringify(rt.errs));
  }

  /* ---------- rest-day cardio: typed minutes and distance, speed and calories worked out, yesterday ---------- */
  {
    const cd = await mk();
    await cd.goto(url); await cd.waitForTimeout(800);
    await cd.evaluate(() => { const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; S.start = E.keyOffset(-20); S.rot = { i: 3, from: E.dkey() }; E.day(E.keyOffset(-1)).plan = 'Rest'; HS.ui.closeSheet(); HS.ui.clearCele(); HS.ui.tab = 'home'; HS.ui.render(true); });
    await cd.waitForTimeout(800);
    ok(await cd.evaluate(() => { const E = HS.E, d = E.day(); d.weighed = true; E.S().weights[E.dkey()] = 83.5; d.done = { breakfast: true, lunch: true }; d.reh = { items: {}, day: 0, knee: 0, back: 0, sharp: false, done: true, n: 5, checked: true }; E.save(); HS.ui.render(); const m = HS.ui.nextMove(); return m.id === 'gym' && /Cardio day/.test(m.title) && /Cardio day/.test(document.querySelector('.move').textContent); }), 'on a rest day, once the scale, lunch and rehab are done, the next move is the cardio day');
    await cd.waitForTimeout(600); await cd.evaluate(() => { HS.ui.clearCele(); HS.ui.gymSheet(); }); await cd.waitForTimeout(500);   /* the day just lit up, so a celebration is in the way */
    await cd.click('[data-a="cardioStart"]'); await cd.waitForTimeout(400);
    await cd.fill('[data-f="rKm"]', '1.6'); await cd.fill('[data-f="wKm"]', '2.5'); await cd.waitForTimeout(200);
    const lv = await cd.evaluate(() => ({ sum: document.querySelector('#cSum').textContent, est: document.querySelector('#cEst').textContent, kept: document.querySelector('[data-f="rKm"]') === document.activeElement || document.querySelector('[data-f="rKm"]').value === '1.6' }));
    ok(/Run 9\.6 km\/h, 6:15 per km/.test(lv.sum) && /Walk 5 km\/h/.test(lv.sum), 'a typed distance gives the run speed and pace (' + lv.sum + ')');
    const kc = +(lv.est.match(/~(\d+) kcal/) || [])[1];
    ok(kc >= 200 && kc <= 450, 'the live calorie estimate follows (' + kc + ' kcal) and the typed numbers stay in the boxes');
    await cd.click('[data-a="wsurf:flat"]'); await cd.waitForTimeout(300);
    const kcFlat = await cd.evaluate(() => +(document.querySelector('#cEst').textContent.match(/~(\d+) kcal/) || [])[1]);
    await cd.click('[data-a="wsurf:inc"]'); await cd.waitForTimeout(300);
    const kc2 = await cd.evaluate(() => +(document.querySelector('#cEst').textContent.match(/~(\d+) kcal/) || [])[1]);
    ok(kc2 > kcFlat + 50, 'walking on a 9% treadmill incline burns more than flat (' + kcFlat + ' to ' + kc2 + ')');
    await cd.click('[data-a="wsurf:flat"]'); await cd.waitForTimeout(200);
    await cd.fill('[data-f="rKm"]', '9'); await cd.waitForTimeout(200);
    ok(await cd.evaluate(() => /Check the running distance/.test(document.querySelector('#cSum').textContent)), 'a distance that is a typo (9 km in 10 minutes) is flagged, not believed');
    await cd.click('[data-a="cardioSave"]'); await cd.waitForTimeout(300);
    ok(await cd.evaluate(() => !!HS.ui.sh && HS.ui.sh.step === 'cardio'), 'the typo is not saved');
    await cd.fill('[data-f="rKm"]', '1.6'); await cd.click('[data-a="noPain"]'); await cd.waitForTimeout(200);
    await cd.click('[data-a="cardioSave"]'); await cd.waitForTimeout(500);
    let cs = await cd.evaluate(() => { const E = HS.E, S = E.S(), d = S.days[E.dkey()]; return { cardio: d.cardio, mins: d.mins, det: d.cardioDet, free: d.runFree, burn: d.burn, aura: S.aura, rot: S.rot.i, key: E.dkey() }; });
    ok(cs.cardio && cs.mins.walk === 30 && cs.mins.run === 10 && cs.det.rKm === 1.6 && cs.det.wKm === 2.5 && cs.det.src === 'manual' && cs.free === 10, 'the cardio day is saved with distances and "no knee pain" (' + JSON.stringify(cs.det) + ')');
    ok(cs.burn >= 150 && cs.burn <= 450 && cs.aura >= 60 && cs.rot === 3, 'it pays 60 aura once, stores the estimate (' + cs.burn + ' kcal) and leaves the rotation alone');
    await cd.evaluate(() => { HS.ui.clearCele(); HS.ui.render(true); }); await cd.waitForTimeout(500);
    ok(await cd.evaluate(() => /Cardio day/.test(document.querySelector('.move, .qrow.done') ? document.body.textContent : '') && /1\.6/.test(JSON.stringify(HS.E.day().cardioDet))), 'Today shows the cardio day as done');
    /* yesterday, typed in the next morning */
    await cd.evaluate(() => { HS.ui.gymSheet(); }); await cd.waitForTimeout(400);
    await cd.click('[data-a="cardioStart"]'); await cd.waitForTimeout(300);
    await cd.click('[data-a="cday:yest"]'); await cd.waitForTimeout(300);
    ok(await cd.evaluate(() => /Yesterday/.test(document.querySelector('#shBody').textContent) && HS.ui.sh.tmp.day === 'yest'), 'a rest day can be logged for yesterday');
    await cd.fill('[data-f="rKm"]', '2'); await cd.click('[data-a="cardioSave"]'); await cd.waitForTimeout(500);
    const ys = await cd.evaluate(() => { const E = HS.E, S = E.S(), y = S.days[E.keyOffset(-1)], t = S.days[E.dkey()]; return { y: y.cardio, yk: y.cardioDet && y.cardioDet.rKm, t: t.cardioDet && t.cardioDet.rKm }; });
    ok(ys.y && ys.yk === 2 && ys.t === 1.6, 'yesterday gets its own run (2 km) and today keeps its own (1.6 km)');
    ok(cd.errs.length === 0, 'no console errors in the cardio checks ' + JSON.stringify(cd.errs));
  }

  /* ---------- the daily spark and streak shields ---------- */
  {
    const sp = await mk();
    await sp.goto(url); await sp.waitForTimeout(800);
    const SP = await sp.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; S.start = E.keyOffset(-12); S.shield = { n: 1, used: {}, checked: {} };
      const lit = k => { const d = E.day(k); d.weighed = true; d.done = { breakfast: true, lunch: true }; d.water = 3000; };
      [-6, -5, -4, -2, -1].forEach(i => lit(E.keyOffset(i)));   /* day -3 was missed */
      const before = E.sparkInfo().n, out = E.sparkSweep();
      const o = { before: before, saved: out.length && out[0].saved, k: out[0] && out[0].k === E.keyOffset(-3), shield: S.shield.n, n: E.sparkInfo().n, st: E.sparkDay(E.keyOffset(-3)) };
      /* a second miss with no shield left ends the streak */
      E.day(E.keyOffset(-1)).water = 0; E.day(E.keyOffset(-1)).done = {}; E.day(E.keyOffset(-1)).weighed = false;
      S.shield.checked = {}; o.after = E.sparkInfo().n;
      /* pain day and rest pass are protected, never missed */
      const d9 = E.day(E.keyOffset(-8)); d9.workout = 'pain'; o.safe = E.sparkDay(E.keyOffset(-8));
      return o;
    });
    ok(SP.before === 2 && SP.saved && SP.k && SP.shield === 0 && SP.st === 'shield', 'a missed day inside a streak of two or more is saved by a shield, once');
    ok(SP.n === 5, 'the shield keeps the streak whole: five lit days across the gap (' + SP.n + ')');
    ok(SP.after === 0 && SP.safe === 'safe', 'without a shield a miss ends the streak, while a pain day is protected');
    const PL = await sp.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; S.cfg.sparkGoal = 3; const d = E.day();
      const p0 = E.pillarsMet(); d.weighed = true; d.water = 3000; d.done = { lunch: true, dinner: true };
      const p3 = E.pillarsMet(), lit = E.sparkDay(E.dkey());
      S.cfg.sparkGoal = 5; const lit5 = E.sparkDay(E.dkey());
      return { p0: p0, p3: p3, lit: lit, lit5: lit5, ids: E.pillarsFor().map(x => x.id).join() };
    });
    ok(PL.p0 === 0 && PL.p3 === 3 && PL.lit === 'lit' && PL.lit5 === 'open' && PL.ids === 'check,fuel,protein,move,rehab,water', 'three of six pillars light the day on Easy, five are needed on Hard');
    ok(sp.errs.length === 0, 'no console errors in the streak checks ' + JSON.stringify(sp.errs));
  }

  /* ---------- rehab: one-sided moves are counted per side ---------- */
  {
    const rh = await mk();
    await rh.goto(url); await rh.waitForTimeout(800);
    await rh.evaluate(() => { const E = HS.E; E.reset(); E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.rehabSheet(); }); await rh.waitForTimeout(600);
    ok(await rh.evaluate(() => document.querySelectorAll('.sidechips').length >= 2 && /30 sec × 3 each leg/.test(document.querySelector('#shBody').textContent)), 'knee to chest and the Pallof press show a Left and a Right box, with 30 seconds on each leg');
    await rh.click('[data-a="rside:b1:L"]'); await rh.waitForTimeout(250);
    let R1 = await rh.evaluate(() => ({ done: HS.E.rehabProgress().done, item: !!HS.E.day().reh.items.b1, L: HS.E.day().reh.sd.b1.L, R: HS.E.day().reh.sd.b1.R }));
    ok(!R1.item && R1.L && !R1.R && R1.done === 0, 'the left leg alone does not tick the move');
    await rh.click('[data-a="rside:b1:R"]'); await rh.waitForTimeout(250);
    const R2 = await rh.evaluate(() => ({ done: HS.E.rehabProgress().done, item: !!HS.E.day().reh.items.b1 }));
    ok(R2.item && R2.done === 1, 'both legs tick it');
    await rh.click('[data-a="rt:b1"]'); await rh.waitForTimeout(250); await rh.click('[data-a="rt:b1"]'); await rh.waitForTimeout(250);
    ok(await rh.evaluate(() => { const r = HS.E.day().reh; return !!r.items.b1 && r.sd.b1.L && r.sd.b1.R; }), 'ticking the whole move ticks both sides');
    const RT = await rh.evaluate(() => { const E = HS.E, o = {}; ['Push', 'Pull', 'Legs', 'Rest'].forEach(t => { E.S().rot.i = E.ROT.indexOf(t); E.day().sess = null; const g = E.rehabGroups(); o[t] = g.groups.map(x => x.title).join(' | '); }); return o; });
    ok(/Day 1: core and stability/.test(RT.Push) && /Day 2: S\/B work/.test(RT.Pull) && /Day 3|Also Day 3/.test(RT.Legs) && /Bonus/.test(RT.Rest), 'rehab follows the session: Push Day 1, Pull Day 2, Legs Day 3, Rest the block plus a bonus');
    ok(rh.errs.length === 0, 'no console errors in the rehab checks ' + JSON.stringify(rh.errs));
  }

  /* ---------- nutrition: protein backup, food facts, the label form ---------- */
  {
    const nu = await mk(null, '2026-10-05T20:30:00');
    await nu.goto(url); await nu.waitForTimeout(800);
    const NU = await nu.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; HS.ui.closeSheet();
      E.addFood('Plain rice', null, 'lunch'); E.addFood('Chapati', null, 'lunch'); E.addFood('Boiled egg', null, 'lunch');
      const pg0 = E.proteinGap(), gap = pg0 && pg0.gap, late = pg0 && pg0.late, bk = E.backupFood(), t = E.totals(E.day()), n = E.nutrients();
      return { gap: gap, late: late, bk: bk && bk.name, p: Math.round(t.p), cfg: S.cfg.backup, cols: n.v.k > 0 && n.v.ca > 0 && n.v.fe > 0 && n.v.vd >= 0, k: Math.round(n.v.k), tk: Math.round(t.k) };
    });
    ok(NU.bk === 'Plant protein powder (1 scoop)' && NU.gap > 80 && NU.late === true, 'the protein backup is ready for a short day (' + NU.gap + ' g to go, backup ' + NU.bk + ')');
    ok(NU.cols && Math.abs(NU.k - NU.tk) <= 1, 'nutrient totals include micronutrients and agree with the calorie total');
    await nu.evaluate(() => HS.ui.foodSheet('Boiled egg')); await nu.waitForTimeout(500);
    const FS = await nu.evaluate(() => document.querySelector('#shBody').textContent);
    ok(/Per 100 g/.test(FS) && /Saturated fat/.test(FS) && /Vitamins and minerals in this portion/.test(FS) && /Where this number comes from/.test(FS) && /Indian Food Composition|IFCT/.test(FS), 'the food facts sheet lists the macros, vitamins and minerals, and says where the number comes from');
    await nu.evaluate(() => { HS.ui.closeSheet(); HS.ui.customSheet({ name: 'Yogabar protein powder', g: 33, asBackup: true }); }); await nu.waitForTimeout(500);
    ok(await nu.evaluate(() => document.querySelector('#cf_name').value === 'Yogabar protein powder' && document.querySelector('#cf_g').value === '33' && !!document.querySelector('#cf_kcal') && !!document.querySelector('#cf_p')), 'the label form opens ready for the owner\'s own protein powder (name and 33 g filled in)');
    ok(nu.errs.length === 0, 'no console errors in the nutrition checks ' + JSON.stringify(nu.errs));
  }

  /* ---------- home-screen widgets: the app draws one picture per widget and hands it to Android ---------- */
  {
    const wp = await mk(() => {
      window.__w = { updates: [], pending: 500, asked: 0 };
      window.Capacitor = { isNativePlatform: () => true, Plugins: { HabitWidget: {
        sizes: async () => { window.__w.asked++; return { density: 2.5, widgets: [{ id: 11, kind: 'streak', w: 158, h: 158 }, { id: 12, kind: 'week', w: 320, h: 78 }, { id: 13, kind: 'today', w: 320, h: 158 }] }; },
        update: async o => { window.__w.updates.push(o); },
        consume: async () => { const p = window.__w.pending; window.__w.pending = 0; return { water: p }; } } } };
      localStorage.setItem('habitsync.proto.v4', JSON.stringify({ v: 5, cfg: { name: 'X' }, welcomed: true, aura: 5 }));
    });
    await wp.goto(url); await wp.waitForTimeout(2500);
    const W = await wp.evaluate(() => {
      const u = window.__w.updates[window.__w.updates.length - 1] || {};
      const dim = b64 => { const a = atob(b64.slice(0, 40)); return { sig: a.slice(1, 4), w: (a.charCodeAt(16) << 24) | (a.charCodeAt(17) << 16) | (a.charCodeAt(18) << 8) | a.charCodeAt(19), h: (a.charCodeAt(20) << 24) | (a.charCodeAt(21) << 16) | (a.charCodeAt(22) << 8) | a.charCodeAt(23) }; };
      return { n: window.__w.updates.length, day: u.day, ds: u.dayStart, imgs: (u.images || []).map(i => ({ id: i.id, d: dim(i.png) })), water: HS.E.day().water, pending: window.__w.pending };
    });
    ok(W.n >= 1 && W.day === '2026-10-05' && W.ds === 3 && W.imgs.length === 3, 'the app sends one picture for each widget that is on the home screen (' + W.imgs.length + ')');
    ok(W.imgs.every(i => i.d.sig === 'PNG' && i.d.w > 200 && i.d.h > 100), 'the pictures are real PNGs at a sharp size ' + JSON.stringify(W.imgs.map(i => i.d.w + 'x' + i.d.h)));
    const ratio = W.imgs.map(i => Math.round(i.d.w / i.d.h * 100) / 100);
    ok(Math.abs(ratio[0] - 1) < .03 && Math.abs(ratio[1] - 320 / 78) < .08 && Math.abs(ratio[2] - 320 / 158) < .06, 'each picture has the proportions of its widget ' + JSON.stringify(ratio));
    ok(W.water === 500 && W.pending === 0, 'water poured from the widget while the app was closed is added when the app opens (' + W.water + ' ml)');
    ok(await wp.evaluate(async () => { const before = window.__w.updates.length; HS.E.addWater(250); await new Promise(r => setTimeout(r, 1600)); return window.__w.updates.length > before; }), 'the widgets are redrawn after the app saves something');
    ok(wp.errs.length === 0, 'no console errors with the widget bridge ' + JSON.stringify(wp.errs));
  }

  /* ---------- the owner's old backup (synthetic, same shape) loads into the new version ---------- */
  {
    const ob = await mk();
    await ob.goto(url); await ob.waitForTimeout(700);
    const OB = await ob.evaluate(() => {
      const E = HS.E, k = n => E.keyOffset(-n), days = {}, weights = {};
      for (let i = 12; i >= 1; i--) days[k(i)] = { items: [{ name: 'Boiled chicken (100 g)', meal: 'lunch', g: 100 }, { name: 'Soya chunks (60 g)', meal: 'dinner', g: 60 }, { name: 'Chapati', meal: 'dinner', g: 80 }], done: { lunch: true, dinner: true }, skip: {}, workout: i === 3 ? 'done' : null, plan: i === 3 ? 'Legs' : null, pain: null, burn: 0, mins: null, runFree: null, reh: null, lift: {}, weighed: true, pAward: false, closed: true, delta: 0, sugarPen: 0, score: 3, steps: '' };
      for (let i = 12; i >= 1; i--) weights[k(i)] = 84 - (12 - i) * .1;
      const st = { v: 5, cfg: { name: 'OLD', kcal: 2050, protein: 140, goalW: 70, gateStep: .5, bossEvery: 4, strict: 'standard', theme: 'auto', roast: 'playful' }, aura: 3000, stats: { STR: 5, VIT: 6, AGI: 1, SNS: 3 }, startW: 84, start: k(14), weights: weights, gates: [83.5], cycle: { a: k(3), i: 2 }, cycles: [{ a: k(3), i: 2 }], days: days, custom: {}, rehab: { confirmed: false, next: 0 }, routine: null, last: {}, pr: {}, fatigue: null, pass: { wk: '', used: false }, missStreak: 0, swept: {} };
      E.importText(JSON.stringify({ app: 'habit-sync', version: 5, state: st }));
      const S = E.S(), d = S.days[k(3)];
      const rawName = Object.values(S.days).some(x => (x.items || []).some(i => i.name === 'Boiled chicken (100 g)' || i.name === 'Soya chunks (60 g)'));
      const resolves = Object.values(S.days).every(x => (x.items || []).every(i => !!E.food(i.name)));
      return { v: S.v, aura: S.aura, days: Object.keys(S.days).length, rot: E.ROT[S.rot.i], legs: E.sessionOf(k(3)), shield: S.shield && S.shield.n, supps: Array.isArray(S.supps) || S.supps === null, spark: E.sparkInfo().n, rawName: rawName, resolves: resolves, kcal: Math.round(E.totals(S.days[k(1)]).k), p: Math.round(E.totals(S.days[k(1)]).p) };
    });
    ok(OB.v === 5 && OB.aura === 3000 && OB.days >= 12, 'an older backup loads with every day and the aura intact');
    ok(OB.legs === 'Legs' && OB.rot === 'Rest', 'the last finished session (Legs) makes Rest the next in the rotation, whatever the weekday');
    ok(!OB.rawName && OB.resolves, 'foods saved under their old names still find their rows (renamed in place)');
    ok(OB.kcal > 500 && OB.p > 40, 'old days are recounted with the corrected food values (' + OB.kcal + ' kcal, ' + OB.p + ' g protein)');
    ok(OB.shield === 1, 'the new streak shield starts at one');
    ok(OB.spark >= 0, 'the streak is computed from the old days without errors');
    await ob.evaluate(() => { HS.ui.tab = 'home'; HS.ui.render(true); }); await ob.waitForTimeout(600);
    const OT = await ob.evaluate(() => { const o = {}; ['home', 'armory', 'path', 'forge'].forEach(t => { try { HS.ui.tab = t; HS.ui.render(); o[t] = document.querySelector('#screen').textContent.length > 200; } catch (e) { o[t] = 'ERR ' + e.message; } }); return o; });
    ok(OT.home === true && OT.armory === true && OT.path === true && OT.forge === true, 'every tab opens from the older backup ' + JSON.stringify(OT));
    ok(ob.errs.length === 0, 'no console errors from the older backup ' + JSON.stringify(ob.errs));
  }


  /* ---------- review fixes: what the reviewers found in version 0.6 ---------- */
  {
    /* an older save loads at start: a custom food from the previous version (no nutrient columns) and an upgrade boot where the pointer and the days disagree */
    const up = await mk(() => {
      const st = { v: 5, cfg: { name: 'X' }, welcomed: true, start: '2026-09-20', aura: 500, cycle: { a: '2026-09-20', i: 0 }, cycles: [{ a: '2026-09-20', i: 0 }],
        custom: { 'Momos plate': { name: 'Momos plate', kcal: 350, p: 0, k100: 350, p100: 0, ug: 100, unit: 'serving', custom: true } },
        days: { '2026-10-03': { workout: 'done', items: [{ name: 'Momos plate', meal: 'lunch', g: 100 }, null, 'x'], done: {}, lift: { 'Squats': { sets: [{ w: 30, r: 8, done: true }], pr: false } }, mins: { lift: 60, walk: 0, run: 0 } }, '2026-10-04': null }, swept: { '2026-10-02': 1 } };
      if (!localStorage.getItem('habitsync.proto.v4')) localStorage.setItem('habitsync.proto.v4', JSON.stringify(st));
    });
    await up.goto(url); await up.waitForTimeout(1100);
    const UP = await up.evaluate(() => {
      const E = HS.E, S = E.S(), f = E.food('Momos plate'); let thrown = ''; try { HS.ui.foodSheet('Momos plate'); } catch (e) { thrown = e.message; }
      HS.ui.closeSheet();
      return { n: f && Array.isArray(f.n) && f.n.length === HS.NUT_COLS.length, kcal: f && f.kcal, thrown: thrown, items: S.days['2026-10-03'].items.length, sess: S.days['2026-10-03'].sess, plan3: E.planFor('2026-10-03'), rot: E.ROT[S.rot.i], aura: S.aura, unread: !!E.unreadable };
    });
    ok(UP.n && UP.kcal === 350 && UP.thrown === '' && !UP.unread, 'a custom food saved by an older version is rebuilt with its nutrient columns, and its facts sheet opens');
    ok(UP.items === 1, 'a null or text entry inside a day\'s items is dropped instead of breaking the day');
    ok(UP.sess === 'Legs' && UP.plan3 === 'Legs' && UP.rot === 'Push' && UP.aura === 500, 'on an upgrade boot a finished day keeps its own session (Legs) and the rest day after it moves the rotation to Push, with no penalty (' + UP.sess + ', ' + UP.rot + ')');
    ok(up.errs.length === 0, 'no console errors on the upgrade boot ' + JSON.stringify(up.errs));
  }
  {
    const rv = await mk();
    await rv.goto(url); await rv.waitForTimeout(800);
    const RV = await rv.evaluate(() => {
      const E = HS.E; E.reset(); const S = E.S(); S.welcomed = true; S.start = E.keyOffset(-12); S.shield = { n: 1, used: {}, checked: {} }; const yk = E.keyOffset(-1), o = {};
      const lit = k => { const d = E.day(k); d.weighed = true; d.done = { breakfast: true, lunch: true }; d.water = 3000; };
      [-5, -4, -3, -2].forEach(i => lit(E.keyOffset(i)));
      const y = E.day(yk); y.weighed = true; y.water = 3000; y.plan = 'Rest';   /* two pillars: not lit */
      E.sparkSweep(); o.used = !!S.shield.used[yk]; o.n1 = S.shield.n;
      E.completeCardio({ walk: 30, run: 0, free: null, det: { wSpd: 5, wInc: 0, rSpd: 9, rInc: 0 } }, yk);
      o.back = S.shield.n; o.cleared = !S.shield.used[yk]; o.lit = E.sparkDay(yk);
      /* a double tap on Finish never pays twice and never skips a session */
      E.reset(); const T = E.S(); T.welcomed = true; const str0 = T.stats.STR, rot0 = T.rot.i;
      E.completeWorkout('Push'); const r1 = T.rot.i, str1 = T.stats.STR, aura1 = T.aura;
      const again = E.completeWorkout('Legs');
      o.once = T.rot.i === r1 && T.stats.STR === str1 && T.aura === aura1 && again.again === true && r1 === (rot0 + 1) % 4 && str1 === str0 + 3;
      return o;
    });
    ok(RV.used && RV.n1 === 0 && RV.back === 1 && RV.cleared && RV.lit === 'lit', 'a shield spent on yesterday comes back when a walk logged afterwards lights that day');
    ok(RV.once, 'finishing a workout twice on one day pays once and does not move the rotation again');
    const HC = await mk(() => {
      window.Capacitor = { isNativePlatform: () => true, Plugins: { Health: {
        isAvailable: async () => ({ available: true }), requestAuthorization: async o => ({ readAuthorized: o.read }),
        queryAggregated: async o => { if (o.dataType === 'flightsClimbed') throw new Error('not aggregated'); return { samples: [{ value: 1000 }] }; },
        readSamples: async o => o.dataType === 'flightsClimbed' ? { samples: [{ value: 4 }, { value: 5 }, { value: 6 }] } : { samples: [] },
        queryWorkouts: async () => ({ workouts: [{ workoutType: 'walking', duration: 1800, totalEnergyBurned: 120 }, { workoutType: 'strengthTraining', duration: 3600, totalEnergyBurned: 250 }] } ) } } };
      localStorage.setItem('habitsync.proto.v4', JSON.stringify({ v: 5, cfg: { name: 'X' }, welcomed: true, aura: 5, health: { on: true, last: 0 } }));
    });
    await HC.goto(url); await HC.waitForTimeout(1300);
    const HW = await HC.evaluate(() => { const d = HS.E.day(); return { floors: d.hFloors, walk: d.hWalk, work: d.hWork }; });
    ok(HW.floors === 15, 'floors climbed are read from the day\'s records and added up (' + HW.floors + ')');
    ok(HW.walk && HW.walk.min === 30 && HW.walk.kcal === 120 && HW.work && HW.work.min === 60 && HW.work.kcal === 250, 'a recorded walk is the walk and only the strength session is the workout ' + JSON.stringify([HW.walk, HW.work]));
  }
  {
    const ui = await mk();
    await ui.goto(url); await ui.waitForTimeout(800);
    await ui.evaluate(() => { const E = HS.E; E.reset(); E.S().welcomed = true; HS.ui.closeSheet(); HS.ui.clearCele(); HS.ui.tab = 'home'; HS.ui.render(true); }); await ui.waitForTimeout(700);
    /* the sheet of a training day keeps one button in its footer so a small phone still shows the picker */
    await ui.evaluate(() => HS.ui.gymSheet()); await ui.waitForTimeout(500);
    const GF = await ui.evaluate(() => ({ foot: document.querySelectorAll('#shFoot button').length, body: !!document.querySelector('#shBody [data-a="gym:pain"]') && !!document.querySelector('#shBody [data-a="gym:lazy"]') }));
    ok(GF.foot === 1 && GF.body, 'the training day sheet has one footer button; pain day, rest pass and skip are in the scrolling part');
    await ui.evaluate(() => HS.ui.closeSheet()); await ui.waitForTimeout(400);
    /* a quick double tap on a sheet's button does not reach the tab bar underneath */
    await ui.evaluate(() => HS.ui.act.bonusSheet()); await ui.waitForTimeout(500);
    await ui.dblclick('#shFoot [data-a="close"]', { delay: 40 }); await ui.waitForTimeout(500);
    ok(await ui.evaluate(() => HS.ui.tab === 'home' && !HS.ui.sh), 'a double tap on Close closes the sheet and stays on Today');
    /* the chart tooltip appears when the chart is touched; long campaigns keep readable labels */
    await ui.evaluate(() => { const E = HS.E, S = E.S(); S.start = E.keyOffset(-220); for (let i = 200; i >= 0; i -= 2) S.weights[E.keyOffset(-i)] = 90 - (200 - i) * .1; E.save(); HS.ui.act.tab('path'); }); await ui.waitForTimeout(1500);
    const CH = await ui.evaluate(() => {
      const hit = document.querySelector('#jhit'), r = hit.getBoundingClientRect();
      hit.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + r.width * .5, clientY: r.top + 40, pointerType: 'touch' }));
      const tip = document.querySelector('#jtip');
      return { shown: getComputedStyle(tip).display !== 'none' && !tip.hasAttribute('hidden'), text: tip.querySelector('.jt1').textContent, xl: document.querySelectorAll('#jchart .jx').length, gl: document.querySelectorAll('#jchart .jl').length };
    });
    ok(CH.shown && /kg/.test(CH.text), 'touching the chart shows the tooltip (' + CH.text + ')');
    ok(CH.xl >= 2 && CH.xl <= 9 && CH.gl <= 16, 'a 200-day chart names about ' + CH.xl + ' dates and ' + CH.gl + ' gates, not all of them');
    /* the cardio sheet keeps its place when a stepper is pressed */
    await ui.setViewportSize({ width: 320, height: 560 });
    await ui.evaluate(() => { const E = HS.E; E.S().rot.i = 3; E.S().start = E.keyOffset(-20); E.day(E.keyOffset(-1)).plan = 'Rest'; HS.ui.closeSheet(); HS.ui.gymSheet(); HS.ui.act.cardioStart(); }); await ui.waitForTimeout(600);
    const SK = await ui.evaluate(async () => { const b = document.querySelector('#shBody'); b.scrollTop = 120; const before = b.scrollTop; HS.ui.act.st('run:5'); await new Promise(r => setTimeout(r, 150)); return { before: before, after: document.querySelector('#shBody').scrollTop }; });
    ok(SK.before > 60 && SK.after === SK.before, 'pressing a stepper in the cardio sheet keeps your place (' + SK.before + ' to ' + SK.after + ')');
    await ui.setViewportSize({ width: 390, height: 844 });
    /* yesterday-only entry: Today cannot be saved on a training day, and typed numbers survive */
    const YD = await ui.evaluate(() => {
      const E = HS.E; E.S().rot.i = 0; E.day().sess = null; HS.ui.closeSheet(); HS.ui.gymSheet(); HS.ui.act.cardioYest();
      const t = HS.ui.sh.tmp; t.wKm = 2.8; t.walk = 35; const hadToggle = !!document.querySelector('[data-a="cday:today"]');
      HS.ui.act.cday('today'); const kept = t.wKm === 2.8 && t.walk === 35;
      const before = !!E.day().cardio; HS.ui.act.cardioSave();
      return { hadToggle: hadToggle, kept: kept, saved: !!E.day().cardio && !before, toast: document.querySelector('#sysT').textContent };
    });
    ok(!YD.hadToggle && YD.kept && !YD.saved && /training day/i.test(YD.toast), 'from "Forgot yesterday", the day is fixed to yesterday; typed numbers survive; Today is refused on a training day');
    /* Samsung steps typed by hand show at once */
    await ui.evaluate(() => { HS.ui.closeSheet(); HS.ui.healthSheet(); }); await ui.waitForTimeout(500);
    await ui.fill('#stepsIn', '7400'); await ui.click('[data-a="saveSteps"]'); await ui.waitForTimeout(500);
    ok(await ui.evaluate(() => /7,400/.test(document.querySelector('#shBody').textContent)), 'steps typed by hand appear in the open sheet straight away');
    ok(ui.errs.length === 0, 'no console errors in the review-fix checks ' + JSON.stringify(ui.errs));
  }

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  await b.close();
  process.exit(failed ? 1 : 0);
})();
