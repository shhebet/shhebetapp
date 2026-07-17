import {
  createEnvelope,
  createSessionKeys,
  decryptJson,
  deriveAesKey,
  encryptJson,
  exportPublicKey,
  generateIdentity,
  SHHEBET_STAGE,
  SHHEBET_VERSION,
  signPhoneClaim,
} from './shhebet-core.mjs';

const state = {
  identity: null,
  phoneClaim: null,
  peer: null,
  channel: null,
  ecdh: null,
  aesKey: null,
  pendingRemote: null,
  mediaStream: null,
  activeKind: 'direct',
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  versionBadge: $('#versionBadge'),
  displayName: $('#displayName'),
  phoneNumber: $('#phoneNumber'),
  createIdentity: $('#createIdentity'),
  identityStatus: $('#identityStatus'),
  phoneClaim: $('#phoneClaim'),
  createOffer: $('#createOffer'),
  acceptOffer: $('#acceptOffer'),
  createAnswer: $('#createAnswer'),
  acceptAnswer: $('#acceptAnswer'),
  localSignal: $('#localSignal'),
  remoteSignal: $('#remoteSignal'),
  connectionState: $('#connectionState'),
  messages: $('#messages'),
  composer: $('#composer'),
  messageInput: $('#messageInput'),
  messageKind: $('#messageKind'),
  chatTitle: $('#chatTitle'),
  audioCall: $('#audioCall'),
  videoCall: $('#videoCall'),
  localVideo: $('#localVideo'),
  remoteVideo: $('#remoteVideo'),
  mediaStage: $('.media-stage'),
  installButton: $('#installButton'),
};

elements.versionBadge.textContent = `${SHHEBET_VERSION} ${SHHEBET_STAGE}`;

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./shhebet-sw.js').catch(() => {});
}

elements.installButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
});

restoreProfile();

elements.createIdentity.addEventListener('click', async () => {
  try {
    const identity = await generateIdentity(elements.displayName.value, elements.phoneNumber.value);
    const phoneClaim = await signPhoneClaim(identity);
    state.identity = identity;
    state.phoneClaim = phoneClaim;
    localStorage.setItem('shhebet.profile', JSON.stringify({
      displayName: identity.displayName,
      phone: identity.phone,
      publicJwk: identity.publicJwk,
      fingerprint: identity.fingerprint,
      phoneClaim,
    }));
    renderIdentity();
    addMessage('system', 'Local phone claim created. Share fingerprint with contacts for trust.', false);
  } catch (error) {
    addMessage('system', error.message, false);
  }
});

document.querySelectorAll('.chat-row, .story').forEach((button) => {
  button.addEventListener('click', () => {
    state.activeKind = button.dataset.kind || 'direct';
    elements.messageKind.value = state.activeKind;
    document.querySelectorAll('.chat-row, .story').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    elements.chatTitle.textContent = titleForKind(state.activeKind);
  });
});

elements.createOffer.addEventListener('click', async () => {
  await ensurePeer();
  state.channel = state.peer.createDataChannel('shhebet-v1', { ordered: true });
  bindChannel(state.channel);
  const offer = await state.peer.createOffer();
  await state.peer.setLocalDescription(offer);
  await waitForIceGathering(state.peer);
  await publishSignal('offer');
});

elements.acceptOffer.addEventListener('click', async () => {
  const signal = parseRemoteSignal();
  if (signal.kind !== 'offer') throwMessage('Remote signal is not an offer.');
  await ensurePeer();
  state.pendingRemote = signal;
  await state.peer.setRemoteDescription(signal.description);
  state.aesKey = await deriveAesKey(state.ecdh.privateKey, signal.ecdhPublicJwk);
  updateConnectionState('offer accepted');
});

elements.createAnswer.addEventListener('click', async () => {
  if (!state.peer || !state.pendingRemote) throwMessage('Accept an offer first.');
  const answer = await state.peer.createAnswer();
  await state.peer.setLocalDescription(answer);
  await waitForIceGathering(state.peer);
  await publishSignal('answer');
});

elements.acceptAnswer.addEventListener('click', async () => {
  const signal = parseRemoteSignal();
  if (signal.kind !== 'answer') throwMessage('Remote signal is not an answer.');
  if (!state.peer) throwMessage('Create an offer first.');
  await state.peer.setRemoteDescription(signal.description);
  state.aesKey = await deriveAesKey(state.ecdh.privateKey, signal.ecdhPublicJwk);
  updateConnectionState('answer accepted');
});

elements.audioCall.addEventListener('click', () => startCall({ video: false, audio: true }));
elements.videoCall.addEventListener('click', () => startCall({ video: true, audio: true }));

elements.composer.addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = elements.messageInput.value.trim();
  if (!body) return;
  const envelope = createEnvelope({
    kind: elements.messageKind.value,
    from: state.identity?.fingerprint ?? 'local-anonymous',
    to: 'manual-peer',
    body,
  });
  addMessage(envelope.kind, body, true);
  elements.messageInput.value = '';

  if (state.channel?.readyState === 'open' && state.aesKey) {
    const encrypted = await encryptJson(state.aesKey, envelope);
    state.channel.send(JSON.stringify(encrypted));
  }
});

async function ensurePeer() {
  if (state.peer) return state.peer;
  state.ecdh = await createSessionKeys();
  const peer = new RTCPeerConnection({ iceServers: [] });
  peer.oniceconnectionstatechange = () => updateConnectionState(peer.iceConnectionState);
  peer.onconnectionstatechange = () => updateConnectionState(peer.connectionState);
  peer.ondatachannel = (event) => {
    state.channel = event.channel;
    bindChannel(state.channel);
  };
  peer.ontrack = (event) => {
    elements.remoteVideo.srcObject = event.streams[0];
    elements.mediaStage.classList.add('active');
  };
  state.peer = peer;
  updateConnectionState('peer ready');
  return peer;
}

function bindChannel(channel) {
  channel.onopen = () => updateConnectionState('encrypted channel open');
  channel.onclose = () => updateConnectionState('channel closed');
  channel.onerror = () => updateConnectionState('channel error');
  channel.onmessage = async (event) => {
    try {
      const packet = JSON.parse(event.data);
      const envelope = state.aesKey ? await decryptJson(state.aesKey, packet) : packet;
      addMessage(envelope.kind || 'direct', envelope.body || JSON.stringify(envelope), false);
    } catch (error) {
      addMessage('system', `Cannot decrypt packet: ${error.message}`, false);
    }
  };
}

async function publishSignal(kind) {
  const signal = {
    type: 'shhebet.manual-signal.v1',
    version: SHHEBET_VERSION,
    kind,
    description: state.peer.localDescription,
    ecdhPublicJwk: await exportPublicKey(state.ecdh),
    from: state.identity?.fingerprint ?? null,
    createdAt: new Date().toISOString(),
  };
  elements.localSignal.value = btoa(JSON.stringify(signal));
  updateConnectionState(`${kind} ready`);
}

function parseRemoteSignal() {
  try {
    return JSON.parse(atob(elements.remoteSignal.value.trim()));
  } catch {
    throwMessage('Paste a valid Shhebet signal.');
  }
}

async function waitForIceGathering(peer) {
  if (peer.iceGatheringState === 'complete') return;
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 1800);
    peer.addEventListener('icegatheringstatechange', () => {
      if (peer.iceGatheringState === 'complete') {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
}

async function startCall(constraints) {
  try {
    await ensurePeer();
    state.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    elements.localVideo.srcObject = state.mediaStream;
    elements.mediaStage.classList.add('active');
    for (const track of state.mediaStream.getTracks()) {
      state.peer.addTrack(track, state.mediaStream);
    }
    addMessage('system', constraints.video ? 'Video tracks attached.' : 'Audio tracks attached.', true);
  } catch (error) {
    addMessage('system', `Call failed: ${error.message}`, false);
  }
}

function addMessage(kind, body, outgoing) {
  const item = document.createElement('li');
  item.className = `message${outgoing ? ' out' : ''}`;
  const label = document.createElement('strong');
  label.textContent = `${outgoing ? 'You' : 'Peer'} · ${kind}`;
  const text = document.createElement('span');
  text.textContent = body;
  const time = document.createElement('time');
  time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  item.append(label, text, time);
  elements.messages.append(item);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function restoreProfile() {
  const stored = localStorage.getItem('shhebet.profile');
  if (!stored) return;
  const profile = JSON.parse(stored);
  elements.displayName.value = profile.displayName || '';
  elements.phoneNumber.value = profile.phone || '';
  state.phoneClaim = profile.phoneClaim;
  elements.identityStatus.textContent = `${profile.displayName} · ${profile.fingerprint}`;
  elements.phoneClaim.textContent = JSON.stringify(profile.phoneClaim, null, 2);
}

function renderIdentity() {
  elements.identityStatus.textContent = `${state.identity.displayName} · ${state.identity.fingerprint}`;
  elements.phoneClaim.textContent = JSON.stringify(state.phoneClaim, null, 2);
}

function updateConnectionState(value) {
  elements.connectionState.textContent = value;
}

function titleForKind(kind) {
  return {
    direct: 'Saved P2P Session',
    group: 'Group Mesh',
    channel: 'Shhebet Channel',
    story: 'My Story',
  }[kind] || 'Saved P2P Session';
}

function throwMessage(message) {
  addMessage('system', message, false);
  throw new Error(message);
}

