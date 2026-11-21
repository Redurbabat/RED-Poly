/**
 * Native iOS/Android speech recognition. Audio goes to the selected OS speech
 * recognition service; some implementations use network processing.
 * No recognition starts or permissions are requested until start() after consent.
 * Audio recordings are NOT persisted and transcripts are only draft text.
 * MIT dependency: jamsch/expo-speech-recognition v56.0.4.
 */
import type { SpeechCallbacks, SpeechSession } from "./web-speech";

export type NativeSpeechRuntime = {
  permission(): Promise<boolean>;
  listenStart(listener: () => void): () => void;
  listenResult(listener: (text: string, final: boolean) => void): () => void;
  listenError(listener: (error: string) => void): () => void;
  listenEnd(listener: () => void): () => void;
  start(lang: string): void;
  abort(): void;
};

async function loadNativeSpeechRuntime(): Promise<NativeSpeechRuntime> {
  // Dynamic import prevents the native module from being required before use.
  // Expo Go lacks this module; the caller catches and displays a build error.
  const { ExpoSpeechRecognitionModule: speech } = await import("expo-speech-recognition");
  return {
    permission: async () => (await speech.requestPermissionsAsync()).granted,
    listenStart: (callback) => {
      const sub = speech.addListener("start", callback);
      return () => sub.remove();
    },
    listenResult: (callback) => {
      const sub = speech.addListener("result", (event) => callback(event.results[0]?.transcript ?? "", event.isFinal));
      return () => sub.remove();
    },
    listenError: (callback) => {
      const sub = speech.addListener("error", (event) => callback(event.error));
      return () => sub.remove();
    },
    listenEnd: (callback) => {
      const sub = speech.addListener("end", callback);
      return () => sub.remove();
    },
    start: (lang) => speech.start({ lang, continuous: false, interimResults: false, maxAlternatives: 1 }),
    abort: () => speech.abort(),
  };
}

export async function createNativeSpeechSession(
  language: string,
  callbacks: SpeechCallbacks,
  runtimeFactory: () => Promise<NativeSpeechRuntime> = loadNativeSpeechRuntime,
): Promise<SpeechSession> {
  const runtime = await runtimeFactory();
  let cancelled = false;
  let recording = false;
  const unsubscribe: Array<() => void> = [];
  const detach = () => {
    while (unsubscribe.length) unsubscribe.pop()?.();
  };
  const finish = () => {
    if (cancelled) return;
    cancelled = true;
    recording = false;
    detach();
    callbacks.onEnd();
  };
  unsubscribe.push(
    runtime.listenStart(() => { if (!cancelled) callbacks.onStart(); }),
    runtime.listenResult((text, isFinal) => {
      if (cancelled || !isFinal) return;
      const draft = text.trim().slice(0, 1000);
      if (draft) callbacks.onText(draft);
    }),
    runtime.listenError((error) => {
      if (cancelled) return;
      if (error !== "aborted") {
        callbacks.onError(error === "not-allowed" ? "permission"
          : error === "no-speech" || error === "speech-timeout" ? "no-speech"
          : error === "network" ? "network" : "unavailable");
      }
      finish();
    }),
    runtime.listenEnd(finish),
  );
  return {
    async start() {
      if (cancelled) return;
      let granted: boolean;
      try { granted = await runtime.permission(); }
      catch {
        if (!cancelled) { callbacks.onError("permission"); finish(); }
        return;
      }
      if (cancelled) return;
      if (!granted) { callbacks.onError("permission"); finish(); return; }
      try {
        recording = true;
        runtime.start(language);
      } catch {
        recording = false;
        callbacks.onError("unavailable");
        finish();
      }
    },
    abort() {
      if (cancelled) return;
      const shouldAbort = recording;
      cancelled = true;
      recording = false;
      detach();
      if (shouldAbort) runtime.abort();
    },
  };
}
