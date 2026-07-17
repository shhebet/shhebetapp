# Shhebet App

Shhebet is a serverless only-P2P messenger foundation. The first repository
build is version `0.0.0.1` (`beta` by the requested versioning scheme).

The UI is intentionally close to Telegram messenger workflows while using the
Shhebet accent color `#26B396`. This project does not vendor private or local
neighbor-project code.

## Current Release Bundles

- `web/` is a static PWA bundle ready to publish on `shhebet.online`.
- `android/` is reserved for the built APK bundle.
- `ios/` is reserved for the Xcode project ZIP bundle.

## Source Foundation

The project is based on open-source references pinned in
`third_party/sources.lock.json`:

- W3C WebRTC API source/specification.
- Telegram Android source.
- Telegram iOS source.
- Telegram Web A source.

Fetch the pinned references into ignored local checkouts:

```powershell
npm run sources:fetch
```

## Build

```powershell
npm run web:build
npm run android:build
npm run ios:package
npm test
```

Android uses the local Android SDK directly and signs an installable APK with a
throwaway build key generated under `build/`. Production stores should replace
that signing step with a private release key outside the repository.

## Serverless Constraints

Shhebet does not use centralized application servers in the runtime design.
The browser build supports manual WebRTC signaling for direct P2P sessions.
Phone-number auth is implemented as a local signed phone claim. A fully
serverless system cannot globally prove SIM/number ownership without an
operator, SMS gateway, trusted oracle, or social verification.

See `docs/requirements-status.md` for the exact status of every strict
requirement.

## License

GPL-3.0-or-later. Commercial use is allowed, with GPL obligations.

