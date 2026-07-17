# Contributing

Keep the repository independent from local private projects. Use only:

- files created in this repository;
- official open-source upstreams listed in `third_party/sources.lock.json`;
- small, attributable third-party code with compatible licenses.

Run before submitting changes:

```powershell
npm test
```

Do not commit runtime payload stores, signing keys, local upstream clones, or
user profile data.

