/* End-to-end checks for the Habit Sync prototype.
   Run: PLAYWRIGHT_PATH=/path/to/playwright CHROME=/path/to/chrome node prototype/test/e2e.js [outDir] */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('path');
const out = process.argv[2] || '/tmp/';
const url = process.env.HS_URL || ('file://' + path.resolve(__dirname, '..', 'index.html'));
let failed = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failed++; };
const S = pg => pg.evaluate(() => JSON.parse(JSON.stringify(HS.E.S())));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await pg.route('**/fonts.g*/**', r => r.abort());
  await pg.goto(url); await pg.waitForTimeout(900);

  /* engine rules */
  ok(await pg.evaluate(() => HS.E.cfg().sound === true), 'sound defaults to on');
  ok(await pg.evaluate(() => HS.E.LVF(2) === 200 && HS.E.rankOf(7) === 'E' && HS.E.rankOf(8) === 'D'), 'levels are slower: level 2 needs 200 aura, rank D starts at level 8');
  const burn = await pg.evaluate(() => HS.E.burnEst(84, 60, 15, 10));
  ok(burn >= 555 && burn <= 560, 'burn estimate for the default session is ' + burn);
  ok(await pg.evaluate(() => HS.E.ladder().length === 18 && HS.E.ladder().filter(g => g.boss).map(g => g.kg).join() === '80,76,75'), 'gate ladder: 18 gates, bosses at 80, 76, 75');
  const p1 = await pg.evaluate(() => { const r = HS.E.parsePart('rice 200g'); const q = HS.E.parsePart('2 chapati'); const t = HS.E.parsePart('chicken 150'); const c = HS.E.parsePart('momos 350 kcal'); return [r.g, q.units, t.tn, c.kc]; });
  ok(JSON.stringify(p1) === '[200,2,150,350]', 'typed input parser: ' + JSON.stringify(p1));

  await pg.screenshot({ path: out + 'a-home.png' });

  /* weigh in */
  await pg.click('[data-a="node:weigh"]'); await pg.click('[data-a="wSave"]'); await pg.waitForTimeout(400);
  ok((await S(pg)).aura === 15, 'weigh-in awards 15 aura');

  /* plate: tiles, typing, ruler */
  await pg.click('[data-a="node:lunch"]'); await pg.waitForTimeout(500);
  await pg.click('.tile >> nth=0'); await pg.waitForTimeout(150);
  await pg.click('.tile >> nth=1'); await pg.waitForTimeout(700);
  await pg.fill('#mIn', '200g rice, 2 chapati'); await pg.press('#mIn', 'Enter'); await pg.waitForTimeout(700);
  const items = (await S(pg)).days[Object.keys((await S(pg)).days)[0]].items;
  const rice = items.find(i => i.name === 'Plain rice'), chap = items.find(i => i.name === 'Chapati');
  ok(rice && rice.g === 200 && chap && chap.g === 80, 'typed grams stored exactly: rice ' + (rice && rice.g) + ' g, chapati ' + (chap && chap.g) + ' g');
  const vis = await pg.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return r('#mIn').bottom <= innerHeight && r('[data-a="mealDone"]').bottom <= innerHeight && r('#rows').height > 120; });
  ok(vis, 'input, tile rows and Done are all on screen together');
  await pg.screenshot({ path: out + 'b-plate.png' });
  /* open the ruler on rice and scroll it */
  await pg.evaluate(() => { const i = HS.E.day().items.findIndex(x => x.name === 'Plain rice'); document.querySelector('[data-a="edit:' + i + '"]').click(); });
  await pg.waitForTimeout(400);
  const box = await pg.locator('#ruler').boundingBox();
  /* headless Chromium cannot synthesise a real touch pan on this container, so mark the ruler as touched and move its scroll position */
  await pg.evaluate(() => { const r = document.querySelector('#ruler'); r.dispatchEvent(new Event('pointerdown')); r.scrollLeft = 520; });
  await pg.waitForTimeout(500);
  const g2 = await pg.evaluate(() => HS.E.day().items.find(x => x.name === 'Plain rice').g);
  ok(g2 === 260, 'scrolling the ruler sets the grams (200 g to ' + g2 + ' g)');
  await pg.screenshot({ path: out + 'c-ruler.png' });
  await pg.click('[data-a="mealDone"]'); await pg.waitForTimeout(500);

  /* workout */
  await pg.click('[data-a="node:gym"]'); await pg.waitForTimeout(400);
  await pg.screenshot({ path: out + 'd-gym-start.png' });
  await pg.click('[data-a="liftStart"]'); await pg.waitForTimeout(500);
  await pg.click('[data-a="exedit:0"]'); await pg.click('[data-a="exw:0:2.5"]'); await pg.click('[data-a="exw:0:2.5"]');
  await pg.click('[data-a="set:0:0"]'); await pg.click('[data-a="set:0:1"]'); await pg.waitForTimeout(400);
  const st1 = await S(pg);
  ok(st1.last['Incline dumbbell press'] && st1.last['Incline dumbbell press'].w === 5, 'set logged from the edited weight (5 kg)');
  await pg.screenshot({ path: out + 'e-lift.png' });
  await pg.click('[data-a="liftFinish"]'); await pg.waitForTimeout(300);
  await pg.click('[data-a="gymNext"]'); await pg.waitForTimeout(300);
  await pg.click('[data-a="pk:sharp"]'); await pg.click('[data-a="gymFinish"]'); await pg.waitForTimeout(500);
  const st2 = await S(pg), d2 = st2.days[Object.keys(st2.days)[0]];
  ok(d2.workout === 'done' && d2.burn >= 555 && st2.stats.STR >= 3 && d2.runFree === 3, 'workout saved: burn ' + d2.burn + ', STR ' + st2.stats.STR);

  /* rehab */
  await pg.click('[data-a="node:rehab"]'); await pg.waitForTimeout(600);
  await pg.screenshot({ path: out + 'f-rehab.png' });
  const figs = await pg.evaluate(() => document.querySelectorAll('svg.fig').length);
  ok(figs >= 11, 'rehab shows a moving outline under each exercise (' + figs + ' figures)');
  await pg.click('[data-a="rt:b0"]'); await pg.click('[data-a="rt:b1"]');
  await pg.click('[data-a="rday:0"]'); await pg.click('[data-a="rt:d0_4"]');
  const reh = (await S(pg)).days; const ri = reh[Object.keys(reh)[0]].reh.items;
  ok(ri.b0 && ri.b1 && !ri.d0_4, 'exercises tick, and the skipped Jefferson curl cannot be ticked');
  await pg.click('[data-a="rview:road"]'); await pg.waitForTimeout(400);
  await pg.screenshot({ path: out + 'g-roadmap.png' });
  ok(await pg.evaluate(() => /DRAFT for your physio/.test(document.querySelector('#shBody').textContent)), 'roadmap is labelled as a draft for the physio');
  await pg.click('[data-a="rview:today"]'); await pg.click('[data-a="rehabFinish"]'); await pg.waitForTimeout(500);

  await pg.screenshot({ path: out + 'h-home-after.png' });
  await pg.click('[data-a="tab:hunter"]'); await pg.waitForTimeout(1500);
  await pg.screenshot({ path: out + 'i-hunter.png' });
  await pg.click('[data-a="tab:settings"]'); await pg.waitForTimeout(700);
  await pg.screenshot({ path: out + 'j-settings.png' });
  await pg.fill('[data-cfg="kcal"]', '2200');
  ok(await pg.evaluate(() => HS.E.T().kcal === 2200 && HS.E.T().hi === 2310), 'settings change the calorie target live (2200 kcal)');
  await pg.click('[data-a="theme:ember"]'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() === '#ff8a3d'), 'theme switch recolours the app');
  await pg.click('[data-a="tab:home"]'); await pg.waitForTimeout(300);

  /* real consequences: fresh state, skip a session */
  await pg.evaluate(() => { HS.E.reset(); HS.ui.render(true); });
  await pg.evaluate(() => { const E = HS.E; E.S().aura = 380; E.save(); });
  const lv0 = await pg.evaluate(() => HS.E.lv().L);
  await pg.evaluate(() => HS.E.skipWorkout());
  const a = await pg.evaluate(() => ({ aura: HS.E.S().aura, fat: HS.E.fatigued(), lv: HS.E.lv().L }));
  ok(a.aura === 320 && a.fat, 'skipping costs 60 aura and starts fatigue (aura ' + a.aura + ')');
  await pg.evaluate(() => HS.E.addAura(100));
  const b1 = await pg.evaluate(() => ({ aura: HS.E.S().aura, lv: HS.E.lv() }));
  ok(b1.aura === 370, 'while fatigued, gains are halved (+100 became +50)');
  await pg.evaluate(() => HS.E.addAura(1000));
  const c1 = await pg.evaluate(() => HS.E.lv());
  ok(c1.locked && c1.L === lv0, 'level is locked while fatigued (stays LV ' + c1.L + ', raw LV ' + c1.raw + ')');
  await pg.evaluate(() => HS.E.completeWorkout('Push'));
  const d1 = await pg.evaluate(() => HS.E.lv());
  ok(!d1.locked && d1.L === d1.raw && d1.L > lv0, 'training lifts the lock and the level catches up (LV ' + d1.L + ')');
  await pg.evaluate(() => { HS.E.painDay(); });
  ok(await pg.evaluate(() => !HS.E.fatigued()), 'a pain day is never punished');

  ok(!(await pg.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), 'no horizontal page scroll');
  ok(errs.length === 0, 'no console errors ' + JSON.stringify(errs));
  await b.close();
  process.exit(failed ? 1 : 0);
})();
