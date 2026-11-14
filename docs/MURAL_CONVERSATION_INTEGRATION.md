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
- Microphone button is intentionally disabled. No recording, consent dialogs or upload are performed. STT requires a separately approved native transcription approach.
- No AI corrections, explanations, personalization based on learner records, generated vocabulary or automated SRS imports exist in this demo. The reply type exposes optional correction and vocabulary fields for future integration.

## Agent contracts and safeguards
- Agent 01: provide an opt-in typed repository adapter for optional conversation/vocabulary associations. Do not write to `progress-v2` from this feature.
- Agent 02: vocabulary suggestions should be reviewed by the learner before import into shared SRS.
- Agent 04: preserve accessible screen controls, light/dark palettes and explicit demo warning.
- Cloud: use a user-consented, authenticated server proxy with secret storage, quotas and deletion policy; never embed private secrets in Expo `EXPO_PUBLIC_*` variables. No provider is enabled by default.
- Stop: abort active request via AbortController; providers must respect signal and avoid auto retries on ambiguous chargeable failures.

## Verification matrix
- GitHub Actions test workflow runs dependency-free Node 22 offline engine tests on PRs. Tests are not proof of an Expo runtime, device speech or real AI provider.
- Manual tests still required: start, send, cancel, persistence after relaunch, offline, invalid data, TTS on iOS/Android/Web, microphone-disabled state, typecheck and Expo start.
- Existing coursework remains reachable through unchanged course routes.
