import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  createEnvelope,
  normalizePhone,
  SHHEBET_ACCENT,
  SHHEBET_VERSION,
  versionStage,
} from '../src/shhebet-core.mjs';

const root = resolve(import.meta.dirname, '..');

test('version follows requested beta mapping', async () => {
  const version = (await readFile(resolve(root, 'VERSION'), 'utf8')).trim();
  assert.equal(version, SHHEBET_VERSION);
  assert.equal(versionStage(version), 'beta');
});

test('phone normalization requires international format', () => {
  assert.equal(normalizePhone('+1 (555) 123-4567'), '+15551234567');
  assert.throws(() => normalizePhone('123'), /Phone must/);
});

test('envelope includes Shhebet version and kind', () => {
  const envelope = createEnvelope({ kind: 'channel', from: 'alice', body: 'post' });
  assert.deepEqual({ ...envelope, createdAt: '<checked>' }, {
    type: 'shhebet.envelope.v1',
    version: SHHEBET_VERSION,
    kind: 'channel',
    from: 'alice',
    to: null,
    body: 'post',
    createdAt: '<checked>',
  });
  assert.match(envelope.createdAt, /\d{4}-\d{2}-\d{2}T/u);
});

test('Telegram accent is replaced by Shhebet accent', async () => {
  assert.equal(SHHEBET_ACCENT, '#26B396');
  const css = await readFile(resolve(root, 'web', 'styles.css'), 'utf8');
  assert.match(css, /#26B396/u);
  assert.doesNotMatch(css, /#27A7E7/iu);
});

test('repository does not reference forbidden local neighbor project', async () => {
  const offenders = [];
  await scan(root, offenders, new RegExp(`shhebet${'messenger'}`, 'iu'));
  assert.deepEqual(offenders, []);
});

async function scan(directory, offenders, forbiddenPattern) {
  const ignored = new Set(['.git', 'node_modules', 'build', 'dist', 'android', 'ios']);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(path, offenders, forbiddenPattern);
      continue;
    }
    if (!/\.(?:md|json|js|mjs|html|css|xml|plist|pbxproj|java|swift|txt|ps1|gitignore|gitattributes)$/u.test(entry.name)) {
      continue;
    }
    const content = await readFile(path, 'utf8');
    if (forbiddenPattern.test(content)) offenders.push(path);
  }
}
