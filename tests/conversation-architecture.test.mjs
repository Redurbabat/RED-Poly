import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import * as engine from "../src/features/conversation/engine.ts";
import * as internalEngine from "../src/features/conversation/domain/engine.ts";
import * as webSpeech from "../src/features/conversation/web-speech.ts";
import * as internalWebSpeech from "../src/features/conversation/speech/web-speech.ts";
import * as nativeSpeech from "../src/features/conversation/native-speech.ts";
import * as internalNativeSpeech from "../src/features/conversation/speech/native-speech.ts";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("conversation domain keeps the exact public runtime objects", () => {
  for (const name of ["LANGUAGES", "TOPICS", "openingLine", "DemoConversationProvider", "demoProvider", "makeMessage"]) {
    assert.equal(engine[name], internalEngine[name], "public conversation export " + name);
  }
  assert.equal(engine.demoProvider.id, "offline-demo");
  assert.equal(engine.demoProvider.isDemo, true);
  assert.deepEqual(engine.LANGUAGES.map((language) => language.code), ["en", "de", "fr", "es", "it", "pt"]);
});

test("native and browser speech adapters preserve the original entry point", () => {
  assert.equal(webSpeech.createWebSpeechSession, internalWebSpeech.createWebSpeechSession);
  assert.equal(webSpeech.isWebSpeechSupported, internalWebSpeech.isWebSpeechSupported);
  assert.equal(nativeSpeech.createNativeSpeechSession, internalNativeSpeech.createNativeSpeechSession);
  assert.equal(webSpeech.isWebSpeechSupported({}), false);
});

test("speech adapters keep explicit consent, cancellation and no eager native loading", () => {
  const native = read("src/features/conversation/speech/native-speech.ts");
  const web = read("src/features/conversation/speech/web-speech.ts");
  assert.match(native, /import\("expo-speech-recognition"\)/);
  assert.match(native, /runtime\.permission\(\)/);
  assert.match(native, /abort\(\)/);
  assert.match(web, /recognition\.abort\(\)/);
  assert.match(web, /recognition\.start\(\)/);
  assert.doesNotMatch(web, /fetch\(/);
});

test("persisted conversation key and public storage imports remain stable", () => {
  const entry = read("src/features/conversation/storage.ts");
  const moved = read("src/features/conversation/data/storage.ts");
  const screen = read("src/app/conversation.tsx");
  assert.match(entry, /export \* from "\.\/data\/storage\.ts"/);
  assert.match(moved, /CONVERSATION_STORAGE_KEY = "red-poly-conversation-v1"/);
  assert.match(moved, /let writeQueue: Promise<void> = Promise\.resolve\(\)/);
  assert.match(moved, /from "\.\.\/domain\/engine"/);
  assert.match(screen, /from "@\/features\/conversation\/engine"/);
  assert.match(screen, /from "@\/features\/conversation\/storage"/);
  assert.match(screen, /from "@\/features\/conversation\/native-speech"/);
  assert.match(screen, /from "@\/features\/conversation\/web-speech"/);
});
