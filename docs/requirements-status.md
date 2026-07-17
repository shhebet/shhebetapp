# Requirements Status

Version: `0.0.0.1` beta.

| Requirement | Status |
| --- | --- |
| Serverless only-P2P | Web runtime uses no central server and no ICE servers. Manual signaling is local copy/paste. |
| Personal dialogs | Implemented for direct WebRTC sessions. |
| Groups | Envelope/UI path present; production fanout/replication is pending. |
| Audio/video calls | WebRTC call controls present; depends on browser permissions and direct connectivity. |
| Channels | Local channel packet type and UI are present; global discovery/replication is pending. |
| Stories | Local story packet type and UI are present; expiry/replication hardening is pending. |
| Full Telegram feature parity | Not complete in beta. Tracked as product target, not claimed as done. |
| Telegram UX/UI parity | Telegram-like layout and interaction model with Shhebet accent `#26B396`; exact asset/trademark copying is avoided. |
| Telegram-grade encryption/security parity | Not complete in beta. DTLS plus AES-GCM message encryption is present. |
| Web/Android/iOS cross-platform | Web bundle, Android shell source/APK, and iOS Xcode ZIP are produced. |
| Inline phone auth without servers | Implemented as local signed phone claim. Global number ownership proof is impossible without telecom/server/trust oracle. |

This file is intentionally explicit so release artifacts do not overstate
security, parity, or connectivity guarantees.

