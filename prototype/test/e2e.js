/* End-to-end check for the Habit Sync prototype.
   Run: PLAYWRIGHT_PATH=/path/to/playwright CHROME=/path/to/chrome node prototype/test/e2e.js [outDir] */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('path');
const out = process.argv[2] || '/tmp/';
const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
let failed = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failed++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await pg.route('**/fonts.g*/**', r => r.abort());
  await pg.goto(url); await pg.waitForTimeout(400);
  await pg.screenshot({ path: out + 'a-home.png' });

  const burn = await pg.evaluate(() => HS.burnEst(84, 60, 15, 10));
  ok(burn >= 555 && burn <= 560, 'burn estimate for the default session is ' + burn);
  ok(await pg.evaluate(() => HS.state().sound === true), 'sound defaults to on');

  await pg.click('[data-a="node:weigh"]'); await pg.click('[data-a="wSave"]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => HS.state().aura === 15), 'weigh-in awards 15 aura');

  await pg.click('[data-a="node:lunch"]'); await pg.waitForTimeout(450);
  await pg.fill('#mIn', '200g rice, 2 chapati, chicken 150');
  await pg.waitForTimeout(100);
  await pg.screenshot({ path: out + 'b-plate-typing.png' });
  await pg.press('#mIn', 'Enter'); await pg.waitForTimeout(250);
  const k = await pg.evaluate(() => Math.round(HS.totals().k));
  ok(Math.abs(k - 634) <= 2, 'typed grams parse: 200 g rice + 2 chapati + 150 g chicken = ' + k + ' kcal (expected 634)');
  const vis = await pg.evaluate(() => {
    const r = s => document.querySelector(s).getBoundingClientRect();
    return { input: r('#mIn').bottom <= innerHeight, done: r('[data-a="mealDone"]').bottom <= innerHeight, rows: r('#rows').height };
  });
  ok(vis.input && vis.done, 'input bar and Done button are on screen without scrolling');
  await pg.click('.tile >> nth=0'); await pg.waitForTimeout(150);
  await pg.click('.pc >> nth=0'); await pg.waitForTimeout(150);
  await pg.fill('#edG', '300'); await pg.waitForTimeout(150);
  const k2 = await pg.evaluate(() => Math.round(HS.totals().k));
  ok(k2 > k, 'editing grams updates totals (' + k + ' to ' + k2 + ')');
  await pg.screenshot({ path: out + 'c-plate-editor.png' });
  await pg.click('[data-a="mealDone"]'); await pg.waitForTimeout(500);

  await pg.click('[data-a="node:gym"]'); await pg.waitForTimeout(400);
  await pg.screenshot({ path: out + 'd-gym.png' });
  await pg.click('[data-a="gym:done"]'); await pg.waitForTimeout(300);
  await pg.screenshot({ path: out + 'e-gym-report.png' });
  await pg.click('[data-a="gymNext"]'); await pg.waitForTimeout(200);
  await pg.click('[data-a="pk:sharp"]'); await pg.waitForTimeout(150);
  await pg.click('[data-a="gymFinish"]'); await pg.waitForTimeout(400);
  const st = await pg.evaluate(() => { const s = HS.state(), d = s.days[Object.keys(s.days)[0]]; return { burn: d.burn, aura: s.aura, str: s.stats.STR, run: d.runFree }; });
  ok(st.burn >= 555 && st.str === 3 && st.run === 3, 'workout saved: burn ' + st.burn + ', STR ' + st.str + ', pain-free run ' + st.run);

  await pg.click('[data-a="node:rehab"]'); await pg.waitForTimeout(400);
  await pg.screenshot({ path: out + 'f-rehab.png' });
  await pg.click('[data-a="rt:b0"]'); await pg.click('[data-a="rt:b1"]');
  const before = await pg.evaluate(() => Object.values(HS.state().days)[0].reh.items);
  await pg.evaluate(() => { const x = document.querySelector('[data-a="rtab:0"]'); x.click(); });
  await pg.click('[data-a="rt:d0_4"]');
  const after = await pg.evaluate(() => Object.values(HS.state().days)[0].reh.items);
  ok(!after.d0_4, 'Jefferson curl cannot be ticked (skipped by you)');
  await pg.click('[data-a="rehabFinish"]'); await pg.waitForTimeout(400);
  const a2 = await pg.evaluate(() => HS.state().aura);
  ok(a2 >= 15 + 100 + 20, 'rehab awards 10 per exercise (aura now ' + a2 + ')');

  await pg.screenshot({ path: out + 'g-home-after.png' });
  await pg.click('[data-a="tab:status"]'); await pg.waitForTimeout(300);
  await pg.screenshot({ path: out + 'h-status.png' });
  await pg.click('[data-a="physio"]'); await pg.waitForTimeout(400);
  await pg.screenshot({ path: out + 'i-physio.png' });
  const txt = await pg.inputValue('#phT');
  ok(/Rehab check-ins: 1 of 14/.test(txt) && /3 minutes of running/.test(txt), 'physio sheet is built from the logs');
  ok(!(await pg.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), 'no horizontal page scroll');
  ok(errs.length === 0, 'no console errors ' + JSON.stringify(errs));
  await b.close();
  process.exit(failed ? 1 : 0);
})();
