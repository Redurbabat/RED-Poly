/**
 * Optional browser speech-to-text. Never runs on native Expo or automatically.
 * IMPORTANT: Some browser vendors transmit microphone audio to a remote
 * recognition service. Always obtain explicit informed opt-in before start().
 * Only the resulting draft is exposed; RED POLY does not upload audio.
 */
export type SpeechFailure = "permission" | "no-speech" | "network" | "unavailable";
export type SpeechCallbacks = {
  onStart(): void;
  onText(text: string): void;
  onEnd(): void;
  onError(reason: SpeechFailure): void;
};
type BrowserSpeechResult = { isFinal: boolean; 0?: { transcript?: string } };
type BrowserSpeechEvent = { results: ArrayLike<BrowserSpeechResult> };
type BrowserSpeech = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: BrowserSpeechEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type SpeechConstructor = new () => BrowserSpeech;
type SpeechEnvironment = { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor };
export type SpeechSession = { start(): void; abort(): void };

export function isWebSpeechSupported(environment: SpeechEnvironment = globalThis as SpeechEnvironment): boolean {
  return typeof (environment.SpeechRecognition ?? environment.webkitSpeechRecognition) === "function";
}

export function createWebSpeechSession(
  language: string,
  callbacks: SpeechCallbacks,
  environment: SpeechEnvironment = globalThis as SpeechEnvironment,
): SpeechSession | null {
  const Constructor = environment.SpeechRecognition ?? environment.webkitSpeechRecognition;
  if (typeof Constructor !== "function") return null;
  const recognition = new Constructor();
  let stopped = false;
  recognition.lang = language;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => { if (!stopped) callbacks.onStart(); };
  recognition.onresult = (event) => {
    if (stopped) return;
    for (let index = 0; index < event.results.length; index++) {
      const result = event.results[index];
      if (result?.isFinal && typeof result[0]?.transcript === "string") {
        const text = result[0].transcript.trim().slice(0, 1000);
        if (text) callbacks.onText(text);
      }
    }
  };
  recognition.onerror = (event) => {
    if (stopped) return;
    const code = event.error;
    callbacks.onError(code === "not-allowed" || code === "service-not-allowed" ? "permission"
      : code === "no-speech" ? "no-speech"
      : code === "network" ? "network" : "unavailable");
  };
  recognition.onend = () => { if (!stopped) callbacks.onEnd(); };
  return {
    start() { if (stopped) throw new Error("Speech session was cancelled"); recognition.start(); },
    abort() { if (stopped) return; stopped = true; recognition.abort(); },
  };
}
