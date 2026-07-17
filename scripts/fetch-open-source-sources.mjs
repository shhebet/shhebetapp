import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import sourcesLock from '../third_party/sources.lock.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstreamRoot = resolve(root, 'third_party', 'upstream');
await mkdir(upstreamRoot, { recursive: true });

for (const source of sourcesLock.sources.filter((entry) => entry.git)) {
  const directoryName = source.name.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
  const target = resolve(upstreamRoot, directoryName);
  await run('git', ['clone', '--filter=blob:none', source.git, target], root, true);
  await run('git', ['checkout', source.revision], target, false);
}

console.log(`Open-source upstreams are available under ${upstreamRoot}`);

function run(command, args, cwd, allowExisting) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('error', rejectRun);
    child.on('exit', (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      if (allowExisting && code === 128) {
        console.log(`Skipping existing checkout: ${args.at(-1)}`);
        resolveRun();
        return;
      }
      rejectRun(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });
  });
}

