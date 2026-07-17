import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHHEBET_STAGE, SHHEBET_VERSION } from '../src/shhebet-core.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'web');

await mkdir(output, { recursive: true });
await cp(resolve(root, 'src', 'shhebet-core.mjs'), resolve(output, 'shhebet-core.mjs'), { force: true });
await writeFile(
  resolve(output, 'release.json'),
  `${JSON.stringify({
    product: 'Shhebet Web',
    version: SHHEBET_VERSION,
    stage: SHHEBET_STAGE,
    builtAt: new Date().toISOString(),
    serverless: true,
    p2p: true,
    iceServers: [],
    accent: '#26B396',
  }, null, 2)}\n`,
  'utf8',
);
await cp(resolve(root, 'LICENSE'), resolve(output, 'LICENSE'), { force: true });
await cp(resolve(root, 'NOTICE'), resolve(output, 'NOTICE'), { force: true });
await rm(resolve(root, 'dist', 'web'), { recursive: true, force: true });
await mkdir(resolve(root, 'dist'), { recursive: true });
await cp(output, resolve(root, 'dist', 'web'), { recursive: true });

const release = JSON.parse(await readFile(resolve(output, 'release.json'), 'utf8'));
console.log(`Built ${release.product} ${release.version} ${release.stage} at ${output}`);
