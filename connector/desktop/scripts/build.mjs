import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '../..');
const output = path.join(root, 'build/extension');
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(path.join(output, 'server'), { recursive: true });
await fs.mkdir(path.join(root, 'dist'), { recursive: true });
const result = await build({ entryPoints: [path.join(root, 'src/server.mjs')], outfile: path.join(output, 'server/index.mjs'), bundle: true,
  platform: 'node', format: 'esm', target: 'node20', metafile: true,
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' } });
for (const item of ['prompts', 'manifest.json', 'README.md']) await fs.cp(path.join(root, item), path.join(output, item), { recursive: true });
await fs.mkdir(path.join(output, 'src'), { recursive: true });
for (const item of ['bridge.py', 'pdf-worker.mjs']) await fs.copyFile(path.join(root, 'src', item), path.join(output, 'src', item));
await fs.cp(path.join(repo, 'plugin/lernly'), path.join(output, 'engine'), { recursive: true, filter: src => !src.includes('__pycache__') });
await fs.cp(path.join(repo, 'node_modules/unpdf'), path.join(output, 'node_modules/unpdf'), { recursive: true });
await fs.copyFile(path.join(repo, 'public/lernly-icon-512.png'), path.join(output, 'icon.png'));
// Preserve the exact licenses of every package actually included by the bundle.
const packages = new Set(['unpdf']);
for (const input of Object.keys(result.metafile.inputs)) {
  const match = input.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  if (match) packages.add(match[1]);
}
await fs.mkdir(path.join(output, 'licenses'), { recursive: true });
const versions = {};
for (const name of [...packages].sort()) {
  const dir = path.join(repo, 'node_modules', name);
  const metadata = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8'));
  versions[name] = metadata.version;
  const licenses = (await fs.readdir(dir)).filter(n => /^(license|copying|notice)/i.test(n));
  if (!licenses.length) throw new Error(`Missing license for ${name}`);
  for (const license of licenses) await fs.copyFile(path.join(dir, license), path.join(output, 'licenses', `${name.replaceAll('/', '-')}-${license}`));
}
await fs.writeFile(path.join(output, 'BUNDLED-DEPENDENCIES.json'), JSON.stringify(versions, null, 2) + '\n');
await fs.writeFile(path.join(output, 'package.json'), JSON.stringify({ name: 'lernly-beta', version: '0.2.0', private: true, type: 'module' }, null, 2));
const artifact = path.join(root, 'dist/lernly-beta-0.2.0.mcpb');
await fs.rm(artifact, { force: true });
execFileSync('/usr/bin/zip', ['-qr', artifact, '.'], { cwd: output });
console.log(JSON.stringify({ artifact, bytes: (await fs.stat(artifact)).size, bundled: versions }, null, 2));
