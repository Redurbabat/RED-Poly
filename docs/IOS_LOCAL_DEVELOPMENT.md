# RED POLY — iPhone development build with a free Apple ID

**Scope:** Prepare the existing Expo app for a local iPhone test. This is not an IPA download, and none of these steps are executed automatically in CI. Only test the code from `agent/03-mural-conversation` before merging.

## What is already verified
- Expo iOS prebuild generates an Xcode project using `com.redurbabat.redpoly`.
- Expo config introspection contains `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription`.
- JavaScript bundling and TypeScript are checked in GitHub Actions.
- Native `expo-speech-recognition` is installed in the project but **needs a freshly built native app**. Expo Go cannot test it.

## Requirements
1. A Mac with the complete Xcode application (not only Command Line Tools); launch Xcode once and accept its licence.
2. An Apple ID added in **Xcode → Settings → Accounts**. A free Apple ID may be eligible for a *Personal Team* that can sign a local development app for your **own connected iPhone**. It cannot be used for App Store or TestFlight distribution.
3. The iPhone must trust the Mac, have Developer Mode enabled when requested, and be connected by cable for initial pairing.
4. Node.js / Bun available on the Mac. Xcode and CocoaPods installation must be working. **Never paste Apple passwords, private keys or provisioning files into this repository or a chat.**

## Commands on the Mac
From an already cloned copy of `Redurbabat/RED-Poly`:

```sh
git fetch origin
git checkout agent/03-mural-conversation
git pull --ff-only origin agent/03-mural-conversation
bun install --frozen-lockfile
bunx expo prebuild --platform ios --clean
bunx expo run:ios --device
```

The final command can prompt for a connected iPhone and a signing team. If automatic signing fails:

1. Open the generated `ios/REDPOLY.xcworkspace` with Xcode (or the `.xcodeproj` if no workspace was generated).
2. Select the **REDPOLY app target → Signing & Capabilities**.
3. Enable **Automatically manage signing** and select **your own Personal Team**.
4. Verify **Bundle Identifier = com.redurbabat.redpoly**. If Apple rejects that ID for your Personal Team, do **not** change the committed app identity to another person's identity; decide on a new ID first.
5. Select the connected iPhone and run the **Debug** configuration from Xcode.
6. Approve Developer Mode and the development certificate trust on the iPhone if prompted.

These are manual instructions, **not evidence that a successful signed iPhone build already exists**.

## Validate speech recognition on-device
1. Open the app → Practice → Conversation, start an offline conversation.
2. Tap the microphone. Read and accept the in-app consent dialog.
3. Respond to the system microphone and speech recognition prompts.
4. Speak a short sentence in the selected language.
5. Confirm the transcript appears **only in the draft box** and does not send itself.
6. Test permission denial, stopping midway, switching languages and leaving the screen.
7. Confirm background/closed-screen recording does not happen, and an offline session still works without live AI.

Speech recognition may use a remote iOS service. The RED POLY demo does not upload raw audio to its own server. Never enable microphone access without informed user consent.

## Limits and cautions
- A free Apple ID's Personal Team can have time-limited provisioning and other signing limits. Rebuilding/re-signing may be necessary. It cannot produce a generally distributable signed IPA.
- No Apple credentials, EAS account, signing certificate, paid Apple Developer team, TestFlight account or hosted Expo project has been configured here.
- A changed Bundle ID creates a **separate app sandbox**. Existing Lingo data will **not** automatically migrate to RED POLY. Keep previous installations until migration is approved.
- The current code is a **scripted offline conversation demo**; it is not a real AI tutor.
- A genuine signed IPA, Xcode compilation on macOS and hardware microphone tests are all still **outstanding**.

## GitHub Actions native simulator compilation (unsigned)
- The existing `RED POLY Conversation Checks` workflow now runs an additional `macos-26` job, requiring Xcode and CocoaPods, to compile the actual iOS Simulator native target (`REDPOLY`).
- The build explicitly sets `CODE_SIGNING_ALLOWED=NO`, checks `CFBundleIdentifier=com.redurbabat.redpoly` inside the generated `.app`, and uploads `red-poly-unsigned-ios-simulator` as a short-lived GitHub Actions artifact when successful.
- This file is a **simulator app archive, not a physical-device IPA**. It does not grant Apple distribution or sideloading rights and cannot be installed directly on an iPhone.
- If the job fails, inspect the native compiler/CocoaPods errors in the workflow logs; do not report it as a completed Xcode build.
