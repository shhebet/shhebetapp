# Security Policy

Shhebet beta `0.0.0.1` is not production-secure for high-risk use.

Implemented in this repository:

- WebRTC transport encryption through DTLS.
- Additional message payload encryption with WebCrypto-derived AES-GCM for
  direct manual sessions.
- Local phone-claim signing.
- No server-side payload storage in the Web bundle.

Known beta limits:

- Manual signaling is copy/paste based.
- Browser-only peers cannot run UDP STUN listeners.
- Global phone-number ownership cannot be proven without a trusted telecom or
  social verification layer.
- TURN-equivalent relay economics and abuse controls are protocol work, not a
  complete production network in this beta.

Report vulnerabilities through the repository issue tracker until a dedicated
security contact is published.

