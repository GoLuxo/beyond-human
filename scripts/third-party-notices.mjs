import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const dirs = execSync('npm ls --omit=dev --all --parseable', { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter((d) => d && path.resolve(d) !== root);

const seen = new Map();
for (const dir of dirs) {
  const pkgFile = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgFile)) continue;
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  const key = `${pkg.name}@${pkg.version}`;
  if (seen.has(key)) continue;
  const licenseFile = fs.readdirSync(dir).find((f) => /^(licen[sc]e|copying)(\.|$)/i.test(f));
  const license = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type ?? 'See package';
  const text = licenseFile ? fs.readFileSync(path.join(dir, licenseFile), 'utf8').trim() : '';
  seen.set(key, { name: pkg.name, version: pkg.version, license, url: pkg.homepage || '', text });
}

const entries = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
if (!entries.length) throw new Error('No production dependencies found');

const out = [
  '# Third-party notices',
  '',
  'Beyond Human includes the open-source components below. Each remains under its own license, reproduced here as its authors require.',
  'The Electron runtime and Chromium ship their own notices next to the app as LICENSE.electron.txt and LICENSES.chromium.html.',
  '',
  '| Component | Version | License |',
  '| --- | --- | --- |',
  ...entries.map((e) => `| ${e.name} | ${e.version} | ${e.license} |`),
  '',
  ...entries.flatMap((e) => [`## ${e.name} ${e.version}`, '', `License: ${e.license}${e.url ? `  \nHomepage: ${e.url}` : ''}`, '', e.text ? '```\n' + e.text + '\n```' : '_No license file included in the package; see its homepage._', '']),
].join('\n');

fs.writeFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), out);
console.log(`THIRD_PARTY_NOTICES.md: ${entries.length} components`);
