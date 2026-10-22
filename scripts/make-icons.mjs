import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const build = path.join(root, 'build');
const assets = path.join(root, 'electron', 'assets');
await fs.mkdir(build, { recursive: true });
await fs.mkdir(assets, { recursive: true });

const C = 2 * Math.PI * 24;
const mark = (color) => `
  <circle cx="32" cy="32" r="24" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"
    stroke-dasharray="${C * 0.84} ${C}" transform="rotate(-90 32 32)"/>
  <circle cx="11.74" cy="19.14" r="4.2" fill="${color}"/>
  <path d="M32 19 Q33.9 30.1 45 32 Q33.9 33.9 32 45 Q30.1 33.9 19 32 Q30.1 30.1 32 19Z" fill="${color}"/>`;

const appIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#1c1c1f"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="14" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="32" y="32" width="960" height="960" rx="216" fill="url(#bg)"/>
  <rect x="33" y="33" width="958" height="958" rx="215" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>
  <g fill="#ffffff">
    <circle cx="214" cy="236" r="4" opacity="0.7"/>
    <circle cx="806" cy="198" r="3" opacity="0.5"/>
    <circle cx="842" cy="760" r="4" opacity="0.6"/>
    <circle cx="176" cy="804" r="3" opacity="0.45"/>
    <circle cx="720" cy="880" r="2.5" opacity="0.4"/>
  </g>
  <g transform="translate(160 160) scale(11)" filter="url(#glow)">${mark('#ffffff')}</g>
</svg>`;

const trayIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="4 4 56 56">${mark('#ffffff').replace('stroke-width="3"', 'stroke-width="4.5"')}</svg>`;

const render = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = await Promise.all(sizes.map((s) => render(appIcon, s)));
await fs.writeFile(path.join(build, 'icon.ico'), await pngToIco(pngs));
await fs.writeFile(path.join(build, 'icon.png'), await render(appIcon, 1024));
await fs.writeFile(path.join(assets, 'icon.png'), await render(appIcon, 256));
await fs.writeFile(path.join(assets, 'tray.png'), await render(trayIcon, 16));
await fs.writeFile(path.join(assets, 'tray@2x.png'), await render(trayIcon, 32));
await fs.writeFile(path.join(assets, 'tray@3x.png'), await render(trayIcon, 48));
console.log('Icons written to build/ and electron/assets/');
