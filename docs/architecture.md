# Shhebet Serverless P2P Architecture

## Runtime Model

Shhebet peers are the network. A peer can provide these roles:

- identity holder;
- WebRTC endpoint;
- manual or local-network signaling bridge;
- peer-operated STUN-like observation node in native clients;
- encrypted mailbox/cache for contacts that explicitly trust it;
- relay helper for media/data when both endpoints opt in.

The Web beta intentionally ships without centralized ICE servers:

```js
new RTCPeerConnection({ iceServers: [] })
```

That keeps the runtime serverless, but limits connectivity to networks where
host candidates can connect. Native Android/iOS clients are where peer-operated
STUN and relay services can be added because browser tabs cannot listen on UDP.

## Identity

Each profile generates a local asymmetric signing key and a display identity.
The phone number is a signed claim attached to that identity. Contacts must
verify the claim through QR, fingerprint, contact-book matching, or social
trust. This is the strongest serverless interpretation of phone auth without
SMS or telecom APIs.

## Messages

Direct messages are encrypted before crossing the WebRTC DataChannel. The beta
uses ECDH-derived AES-GCM session keys. Group, channel, and story packets share
the same envelope structure and are ready for later replicated storage.

## Calls

Audio/video calls use WebRTC media tracks. When a manual session is connected,
the caller can add microphone/camera tracks and the remote peer receives them
directly.

