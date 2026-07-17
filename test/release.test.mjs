import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('open-source source lock pins requested upstreams', async () => {
  const lock = JSON.parse(await readFile(resolve(root, 'third_party', 'sources.lock.json'), 'utf8'));
  assert.equal(lock.sources.length, 4);
  assert.deepEqual(lock.sources.map((source) => source.git).filter(Boolean), [
    'https://github.com/w3c/webrtc-pc.git',
    'https://github.com/DrKLO/Telegram.git',
    'https://github.com/TelegramMessenger/Telegram-iOS.git',
    'https://github.com/Ajaxy/telegram-tt.git',
  ]);
  for (const source of lock.sources) {
    assert.match(source.revision, /^[0-9a-f]{40}$/u);
  }
});

test('web bundle is publishable and serverless', async () => {
  for (const file of ['index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'release.json']) {
    await access(resolve(root, 'web', file));
  }
  const release = JSON.parse(await readFile(resolve(root, 'web', 'release.json'), 'utf8'));
  assert.equal(release.version, '0.0.0.1');
  assert.equal(release.stage, 'beta');
  assert.equal(release.serverless, true);
  assert.deepEqual(release.iceServers, []);
});

test('platform release folders contain expected artifacts after packaging', async () => {
  const apk = await stat(resolve(root, 'android', 'Shhebet-0.0.0.1-beta.apk'));
  const zip = await stat(resolve(root, 'ios', 'Shhebet-iOS-0.0.0.1-beta.zip'));
  assert.ok(apk.size > 1024);
  assert.ok(zip.size > 1024);
});

