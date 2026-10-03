/* seed.js: builds a believable few weeks of history inside the page, so screenshots and tests can see the app mid-game.
   Usage inside page.evaluate: seedMidGame(24, {weights: true}). Everything goes through the real engine objects. */
function seedMidGame(days, opt) {
  opt = opt || {};
  const E = HS.E;
  E.reset();
  const S = E.S();
  S.welcomed = true; S.cfg.name = 'HUNTER';
  const today = E.dkey();
  S.start = E.addDays(today, -days);
  const foods = [['Boiled egg', 100], ['Plain rice', 200], ['Chapati', 80], ['Veg salad', 100]];
  let rnd = 7; const r = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
  for (let i = days; i >= 1; i--) {
    const k = E.addDays(today, -i), d = E.day(k), plan = E.planFor(k);
    const w = Math.round((84 - 0.13 * (days - i) + (r() - .5) * .5) * 10) / 10;
    if (opt.weights !== false && r() < .85) { S.weights[k] = w; d.weighed = true; }
    d.items = [{ name: 'Boiled egg', meal: 'breakfast', g: 100 }, { name: 'Plain rice', meal: 'lunch', g: 250 }, { name: 'Chapati', meal: 'dinner', g: 120 }];
    d.done = { breakfast: true, lunch: true, dinner: r() < .8 };
    d.stars = { breakfast: 2, lunch: 3 };
    if (plan !== 'Rest') d.workout = r() < .88 ? 'done' : 'lazy';
    d.pAward = r() < .78; d.waterHit = r() < .6; d.water = d.waterHit ? 3000 : 1800;
    d.reh = { items: { b0: true, b1: true }, day: 0, knee: Math.floor(r() * 4), back: Math.floor(r() * 3), sharp: false, done: r() < .7, n: 9 };
    d.sleep = 6 + Math.floor(r() * 4) * .5;
    d.calOk = r() < .7; d.closed = i > 0; d.score = (d.pAward ? 1 : 0) + (d.calOk ? 1 : 0) + (d.workout === 'done' || plan === 'Rest' ? 1 : 0) + (d.reh.done ? 1 : 0);
    d.swept = true; S.swept[k] = 1;
  }
  S.aura = 3100; S.stats = { STR: 22, VIT: 31, AGI: 14, SNS: 19 };
  const tr = E.trend();
  E.ladder().forEach(g => { if (tr <= g.kg + 1e-6) { S.gates.push(g.kg); S.gateDates[g.kg] = E.addDays(today, -3); } });
  S.counters.pr = 3; S.last = { 'Squats': { w: 30, r: 8 } };
  E.persist(); E.checkUnlocks(); E.checkGoals();
  return { trend: E.trend(), gates: S.gates.length, owned: Object.keys(S.owned).length };
}
if (typeof module !== 'undefined') module.exports = { src: seedMidGame.toString() };
