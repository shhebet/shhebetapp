export const SHHEBET_VERSION = '0.0.0.1';
export const SHHEBET_STAGE = 'beta';
export const SHHEBET_ACCENT = '#26B396';

export function normalizePhone(value) {
  const phone = String(value ?? '').trim();
  const normalized = phone.startsWith('+')
    ? `+${phone.slice(1).replace(/\D/gu, '')}`
    : `+${phone.replace(/\D/gu, '')}`;
  if (!/^\+\d{7,15}$/u.test(normalized)) {
    throw new Error('Phone must be in international format, for example +15551234567.');
  }
  return normalized;
}

export function versionStage(version) {
  const parts = String(version).split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Unsupported Shhebet version: ${version}`);
  }
  if (parts[2] === 0) return 'beta';
  if (parts[2] === 1) return 'alpha';
  if (parts[2] === 2) return 'release-candidate';
  if (parts[2] === 3) return 'release';
  return 'post-release';
}

export function createEnvelope({ kind = 'direct', from, to = null, body, createdAt = new Date().toISOString() }) {
  if (!from) throw new Error('Envelope sender is required.');
  if (!body) throw new Error('Envelope body is required.');
  return {
    type: 'shhebet.envelope.v1',
    version: SHHEBET_VERSION,
    kind,
    from,
    to,
    body,
    createdAt,
  };
}

export async function sha256Hex(value) {
  const input = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', input);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function generateIdentity(displayName, phone) {
  const normalizedPhone = normalizePhone(phone);
  const signingKey = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', signingKey.publicKey);
  const fingerprint = (await sha256Hex(JSON.stringify(publicJwk))).slice(0, 32);
  return {
    type: 'shhebet.identity.v1',
    version: SHHEBET_VERSION,
    displayName: String(displayName || 'Shhebet User').trim(),
    phone: normalizedPhone,
    publicJwk,
    fingerprint,
    createdAt: new Date().toISOString(),
    privateKey: signingKey.privateKey,
  };
}

export async function signPhoneClaim(identity) {
  const claim = {
    type: 'shhebet.phone-claim.v1',
    version: SHHEBET_VERSION,
    phone: identity.phone,
    fingerprint: identity.fingerprint,
    createdAt: new Date().toISOString(),
    serverVerified: false,
    verificationModel: 'local-signed-claim',
  };
  const payload = new TextEncoder().encode(JSON.stringify(claim));
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    identity.privateKey,
    payload,
  );
  return {
    ...claim,
    signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
  };
}

export async function importEcdhPublicKey(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
}

export async function createSessionKeys() {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey'],
  );
}

export async function exportPublicKey(keyPair) {
  return crypto.subtle.exportKey('jwk', keyPair.publicKey);
}

export async function deriveAesKey(privateKey, remotePublicJwk) {
  const remotePublicKey = await importEcdhPublicKey(remotePublicJwk);
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: remotePublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptJson(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return {
    type: 'shhebet.cipher.v1',
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(cipher)),
  };
}

export async function decryptJson(key, packet) {
  const iv = base64ToBytes(packet.iv);
  const cipher = base64ToBytes(packet.data);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain));
}

export function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

