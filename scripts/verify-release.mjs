import { access, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SHHEBET_VERSION, versionStage } from '../src/shhebet-core.mjs';

const root = resolve(import.meta.dirname, '..');
const requiredFiles = [
  'VERSION',
  'LICENSE',
  'README.md',
  'third_party/sources.lock.json',
  'web/index.html',
  'web/app.js',
  'web/styles.css',
  'web/release.json',
  'android/Shhebet-0.0.0.1-beta.apk',
  'ios/Shhebet-iOS-0.0.0.1-beta.zip',
];

for (const file of requiredFiles) {
  await access(resolve(root, file));
}

const version = (await readFile(resolve(root, 'VERSION'), 'utf8')).trim();
if (version !== SHHEBET_VERSION) {
  throw new Error(`VERSION mismatch: ${version} != ${SHHEBET_VERSION}`);
}
if (versionStage(version) !== 'beta') {
  throw new Error(`Expected beta stage for ${version}`);
}

for (const artifact of ['android/Shhebet-0.0.0.1-beta.apk', 'ios/Shhebet-iOS-0.0.0.1-beta.zip']) {
  const info = await stat(resolve(root, artifact));
  if (info.size < 1024) throw new Error(`Artifact is unexpectedly small: ${artifact}`);
}

console.log(`Release ${version} verified.`);

