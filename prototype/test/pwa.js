/* Offline and install checks for the PWA build.
   Run: PLAYWRIGHT_PATH=... CHROME=... node prototype/test/pwa.js [outDir]
   Builds the Pages site, serves it on localhost, lets the service worker install, then goes offline and reloads. */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path'), fs = require('fs'), os = require('os');
const out = process.argv[2] || '/tmp/';
let failed = 0, passed = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (c) passed++; else failed++; };
(async () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-site-'));
  execFileSync('python3', [path.resolve(__dirname, '..', 'build.py'), '--pages', site]);
  const port = 8700 + Math.floor(Math.random() * 200);
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--directory', site], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR/.test(m.text())) errs.push(m.text()); });
  pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  const base = 'http://localhost:' + port + '/';
  try {
    await pg.goto(base); await pg.waitForTimeout(1200);
    const mf = await pg.evaluate(async () => { const r = await fetch('manifest.webmanifest'); return r.ok ? await r.json() : null; });
    ok(mf && mf.display === 'standalone' && mf.icons.length >= 4 && mf.shortcuts.length === 3, 'manifest: standalone, icons and three shortcuts');
    const reg = await pg.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
    ok(reg, 'service worker installed and active');
    await pg.evaluate(() => { HS.E.S().welcomed = true; HS.E.S().cfg.name = 'OFFLINE'; HS.E.save(); });
    await pg.waitForTimeout(500);
    await ctx.setOffline(true);
    await pg.reload(); await pg.waitForTimeout(1500);
    const name = await pg.evaluate(() => document.querySelector('.who b') && document.querySelector('.who b').textContent);
    ok(name === 'OFFLINE', 'with no network the app reloads from the cache and keeps its data (' + name + ')');
    ok(await pg.evaluate(() => /fonts\.css|@font-face/.test(Array.from(document.styleSheets).map(s => { try { return s.cssRules.length ? 'ok' : '' } catch (e) { return '' } }).join('') + document.head.innerHTML)), 'fonts are bundled, nothing is fetched from the internet');
    const ext = await pg.evaluate(() => performance.getEntriesByType('resource').filter(r => !r.name.startsWith(location.origin)).map(r => r.name));
    ok(ext.length === 0, 'no request leaves the app origin ' + JSON.stringify(ext));
    const st = await pg.evaluate(async () => ({ persist: navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null, ls: !!localStorage.getItem('habitsync.proto.v4') }));
    ok(st.ls, 'data is in localStorage on the device');
    await pg.screenshot({ path: out + 'p1-offline.png' });
  } finally {
    ok(errs.length === 0, 'no console errors ' + JSON.stringify(errs));
    await b.close(); srv.kill();
    fs.rmSync(site, { recursive: true, force: true });
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
