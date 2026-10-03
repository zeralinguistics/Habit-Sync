/* Renders the app emblem (a hooded head with two glowing eyes inside a hexagon) to PNG icons.
   Usage: PLAYWRIGHT_PATH=... CHROME=... node make-icons.js <webIconsDir> [androidResDir] */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path');
const webDir = process.argv[2], resDir = process.argv[3];
const GLOW = '#3aa8ff';
function svg({ bg, shape, scale }) {
  const bgEl = bg === 'full' ? '<rect width="512" height="512" fill="#05070d"/><circle cx="256" cy="256" r="250" fill="url(#g)"/>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs><radialGradient id="g"><stop offset="0" stop-color="${GLOW}" stop-opacity=".38"/><stop offset="1" stop-color="${GLOW}" stop-opacity="0"/></radialGradient>
  <filter id="b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter><clipPath id="hx"><polygon points="256,70 417,163 417,349 256,442 95,349 95,163"/></clipPath></defs>
  ${bgEl}
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <polygon points="256,64 422,160 422,352 256,448 90,352 90,160" fill="none" stroke="${GLOW}" stroke-width="16" filter="url(#b)" opacity=".9"/>
    <polygon points="256,64 422,160 422,352 256,448 90,352 90,160" fill="#07101f" stroke="${GLOW}" stroke-width="12"/>
    <path clip-path="url(#hx)" d="M140 430 C140 342 200 318 256 318 C312 318 372 342 372 430 Z" fill="#0a1426" stroke="${GLOW}" stroke-width="6"/>
    <path d="M256 126 C198 126 172 176 172 224 C172 278 208 312 256 312 C304 312 340 278 340 224 C340 176 314 126 256 126 Z" fill="#0b1830" stroke="#9fd2ff" stroke-width="7"/>
    <g filter="url(#b)" fill="#fff"><rect x="206" y="212" width="46" height="14" rx="7"/><rect x="260" y="212" width="46" height="14" rx="7"/></g>
    <g fill="#fff"><rect x="206" y="212" width="46" height="14" rx="7"/><rect x="260" y="212" width="46" height="14" rx="7"/></g>
  </g></svg>`;
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const pg = await b.newPage();
  async function render(opts, size, file, circle) {
    await pg.setViewportSize({ width: size, height: size });
    await pg.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block;${circle ? 'border-radius:50%;' : ''}}</style>` + svg(opts));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await pg.screenshot({ path: file, omitBackground: true });
  }
  if (webDir) {
    await render({ bg: 'full', scale: 1 }, 512, path.join(webDir, 'icon-512.png'));
    await render({ bg: 'full', scale: 1 }, 192, path.join(webDir, 'icon-192.png'));
    await render({ bg: 'full', scale: .74 }, 512, path.join(webDir, 'icon-maskable-512.png'));
    await render({ bg: 'full', scale: .74 }, 192, path.join(webDir, 'icon-maskable-192.png'));
    await render({ bg: 'full', scale: .9 }, 180, path.join(webDir, 'apple-touch-icon.png'));
  }
  if (resDir) {
    const dens = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
    for (const [d, [legacy, fg]] of Object.entries(dens)) {
      const dir = path.join(resDir, 'mipmap-' + d);
      await render({ bg: 'full', scale: .98 }, legacy, path.join(dir, 'ic_launcher.png'));
      await render({ bg: 'full', scale: .98 }, legacy, path.join(dir, 'ic_launcher_round.png'), true);
      await render({ bg: 'none', scale: .6 }, fg, path.join(dir, 'ic_launcher_foreground.png'));
    }
    await render({ bg: 'none', scale: 1 }, 480, path.join(resDir, 'drawable', 'splash_emblem.png'));
  }
  await b.close();
})();
