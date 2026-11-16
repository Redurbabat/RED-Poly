# RED POLY — Agent 03 Mural conversation integration

## Origin and licensing
- Upstream: https://github.com/Chuloo/mural
- Imported source: `integrations/mural/`, MIT (see its LICENSE); exact upstream revision not independently established.
- Concepts examined: Android `core/TeachingPolicy.kt`, `ConversationPace.kt`, `Languages.kt`, `ConversationProviders.kt`, `ProviderFailure.kt`, `network/TeachingResponse.kt`.
- Adaptation: original RED POLY TypeScript offline demo, typed provider contract, local history, topic/language/level controls. No copied artwork, audio, backend, billing, native SwiftUI or Compose code.
- Mural principle: short single-question turns, conservative corrections, learner-controlled topics, provisional levels, explicit provider choice. Demo **does not** pretend to correct errors.

## Operational status
- `/conversation` is the React Native Expo Router page, linked from Practice.
- Only the `offline-demo` provider is wired. It returns static prompt sequences. No requests, API secrets, subscriptions or paid endpoints.
- `ConversationProvider.reply(request, signal)` is the extension boundary for a future provider, not a tested cloud connection.
- History is stored separately in AsyncStorage `red-poly-conversation-v1`. Max 100 validated messages on load/save. Existing `progress-v2` stays untouched.
- Expo Speech enables optional device TTS, with speech errors displayed. TTS behaviour is platform-dependent and requires real device verification.
- Web-only dictation uses the browser's SpeechRecognition API after explicit, visible consent. Browser vendors may transmit microphone audio to a remote recognition service; RED POLY does not control this service. Results go into the draft field and are **never auto-submitted**.
- Native iOS/Android dictation now uses a dynamically imported `expo-speech-recognition@56.0.4` (MIT, https://github.com/jamsch/expo-speech-recognition, upstream tag `v56.0.4`; © 2024 jamsch). A new iOS/Android **development build** is required; Expo Go will not include the module. No native build or device transcription is yet verified.
- Expo config plugin adds microphone and iOS speech recognition permission descriptions. The UI presents explicit consent before requesting OS permissions. Device speech services may process audio remotely; no recordings are persisted by RED POLY.
- Native recording permission denial, delayed permission responses, cancellation and late results are covered using mocked runtime tests. These tests do NOT verify actual hardware, permission dialogs or SDK integration.
- Dictation starts only after a user action, stops on cancellation/screen unmount/navigation, and stores no raw microphone recordings.
- No AI corrections, explanations, personalization based on learner records, generated vocabulary or automated SRS imports exist in this demo. The reply type exposes optional correction and vocabulary fields for future integration.

## Agent contracts and safeguards
- Agent 01: provide an opt-in typed repository adapter for optional conversation/vocabulary associations. Do not write to `progress-v2` from this feature.
- Agent 02: vocabulary suggestions should be reviewed by the learner before import into shared SRS.
- Agent 04: preserve accessible screen controls, light/dark palettes and explicit demo warning.
- Cloud: use a user-consented, authenticated server proxy with secret storage, quotas and deletion policy; never embed private secrets in Expo `EXPO_PUBLIC_*` variables. No provider is enabled by default.
- Stop: abort active request via AbortController; providers must respect signal and avoid auto retries on ambiguous chargeable failures.

## Verification matrix
- GitHub Actions runs Node 22 offline engine and simulated Web and Native Speech adapter tests, installs the Bun lockfile and typechecks the Expo app with tsconfig.conversation.json. CI success is not proof of a native build, browser speech, device TTS or a real AI provider.
- Manual tests still required: start, send, cancel, persistence after relaunch, offline, invalid data, real browser speech permission/denial/audio flow, TTS on iOS/Android/Web, native microphone-disabled state and Expo start.
- Existing coursework remains reachable through unchanged course routes.

## Native dependency provenance
- Package: `expo-speech-recognition` pinned at `56.0.4`; MIT license; author jamsch; https://github.com/jamsch/expo-speech-recognition/tree/v56.0.4
- Official Expo SDK 56 version family. This is a new package dependency, not a copy of native Mural source or audio assets.
- Native events: start, final result, error, end; no saved WAV/audio, no background capture, no automatic transcript submission, no cloud AI provider configured.
- Device testing remains mandatory before claiming iOS/Android recording support. Build only after the unrelated inherited app identifier and signing identity have been reviewed by the maintainer.

## RED POLY application identity and build safety
- Configuration updated from inherited Lingo identifiers to `RED POLY`, `red-poly`, `redpoly`, `com.redurbabat.redpoly` (iOS + Android).
- Removed inherited Expo `owner`, `extra.eas.projectId` and the unrelated App Store `ascAppId`. No new owner/project ID was invented. A fresh EAS project must be linked by the actual Expo-account owner before any remote build. No EAS signing/build/submission executed.
- **Data warning:** Changing the bundle/package ID creates a separate app installation and storage sandbox. Existing `progress-v2` records from older installations are **not** automatically migrated. Preserve original installations, identifiers and backups until a reviewed export/import or migration path exists.
- Existing icons and other Lingo assets are unchanged and their rights remain subject to review; no release is authorized by this change.
- Device installs, app upgrade, signing, and App Store publishing remain **NOT TESTED**. CI covers identity assertions, native Expo config generation, offline unit tests and TypeScript only.

## Native configuration introspection
- On pull requests, CI executes `expo config --type introspect --json`, then asserts the evaluated iOS `NSMicrophoneUsageDescription` / `NSSpeechRecognitionUsageDescription` and the Android `RECORD_AUDIO` permission.
- This tests actual evaluated config plugins, **not** an Xcode compile, signed IPA, Android APK, provisioning profile or a device permission popup.

## Native iOS generation smoke test
- CI performs unsigned `expo prebuild --platform ios --no-install --clean` on Ubuntu to check native project generation without CocoaPods, Xcode, credentials or IPA output.
- The generated iOS project and Info.plist are inspected for `com.redurbabat.redpoly`, the `redpoly` URL scheme and speech/microphone permission text.
- Success proves config generation only, **not** compilation, signing, an installable build or physical-device dictation.

## Local no-paid-account development path
- See [`docs/IOS_LOCAL_DEVELOPMENT.md`](IOS_LOCAL_DEVELOPMENT.md): local Xcode/Personal Team instructions, consent verification and safe limitations.
- CI separately exports the iOS JavaScript bundle without signing. Passing that check only confirms Metro can bundle app code, not native linking or physical-device installation.
