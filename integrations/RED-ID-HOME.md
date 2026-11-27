# Private RED ID pilot
The profile screen contains optional identity settings. A local Expo module
bridges the existing RED native SDK to iOS Keychain and Android Keystore.
Web uses RAM-only SDK. No progress export or sharing, no replacement of
existing local progress. Expo Go lacks this custom module; rebuild the
development client. Native SDK copied from Redion PR #257 revision e11c7553a0a05a1e9f38ff05bbbda894aefb0c10,
no new npm dependencies. Native code rights must be reviewed before release.
CI verifies TS, autolinking and web bundle; native build and physical tests
are still required. iOS/Android application identifiers and EAS owner are
unchanged intentionally.

The mobile check uses `tsconfig.mobile.json`: the independent upstream
WordPecker integration has its own dependencies and is not included in the
Expo app compiler check. No existing TypeScript errors are suppressed in
`src/`; the original repository-wide configuration remains unchanged.
