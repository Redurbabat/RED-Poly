import assert from "node:assert/strict";
import { test } from "node:test";
import { createWebSpeechSession, isWebSpeechSupported } from "../src/features/conversation/web-speech.ts";

function fakeEnvironment() {
  const state = { last: undefined };
  class FakeSpeech {
    lang = ""; continuous = true; interimResults = true; maxAlternatives = 4;
    onstart = null; onresult = null; onerror = null; onend = null;
    start() { state.last = this; this.onstart?.(); }
    abort() { this.onend?.(); }
  }
  return { state, environment: { SpeechRecognition: FakeSpeech } };
}

test("unsupported browsers fail closed", () => {
  assert.equal(isWebSpeechSupported({}), false);
  assert.equal(createWebSpeechSession("de-DE", { onStart() {}, onText() {}, onEnd() {}, onError() {} }, {}), null);
});
test("speech session starts only on explicit invocation and sets language", () => {
  const { state, environment } = fakeEnvironment();
  let starts = 0; let result = "";
  const session = createWebSpeechSession("fr-FR", {
    onStart() { starts++; }, onText(t) { result = t; }, onEnd() {}, onError() {}
  }, environment);
  assert.ok(session);
  assert.equal(state.last, undefined, "constructing must never request microphone");
  session.start();
  assert.equal(starts, 1);
  assert.equal(state.last.lang, "fr-FR");
  assert.equal(state.last.continuous, false);
  assert.equal(state.last.interimResults, false);
  state.last.onresult?.({ results: [{ isFinal: false, 0: { transcript: "unfinished" } }] });
  assert.equal(result, "");
  state.last.onresult?.({ results: [{ isFinal: true, 0: { transcript: "  Bonjour !  " } }] });
  assert.equal(result, "Bonjour !");
});
test("abort suppresses late transcripts and errors", () => {
  const { state, environment } = fakeEnvironment();
  const received = [];
  const session = createWebSpeechSession("en-US", {
    onStart() {}, onText(t) { received.push(t); }, onEnd() { received.push("end"); },
    onError(code) { received.push(code); }
  }, environment);
  session.start();
  session.abort();
  session.abort();
  state.last.onresult?.({ results: [{ isFinal: true, 0: { transcript: "sensitive" } }] });
  state.last.onerror?.({ error: "network" });
  assert.deepEqual(received, []);
});
test("permission denial and network errors get safe error categories", () => {
  const { state, environment } = fakeEnvironment();
  const errors = [];
  const session = createWebSpeechSession("de-DE", {
    onStart() {}, onText() {}, onEnd() {}, onError(e) { errors.push(e); }
  }, environment);
  session.start();
  state.last.onerror?.({ error: "not-allowed" });
  state.last.onerror?.({ error: "network" });
  state.last.onerror?.({ error: "service-not-allowed" });
  state.last.onerror?.({ error: "no-speech" });
  assert.deepEqual(errors, ["permission", "network", "permission", "no-speech"]);
});
test("prefixed webkit browser API is accepted", () => {
  const { environment } = fakeEnvironment();
  assert.ok(isWebSpeechSupported({ webkitSpeechRecognition: environment.SpeechRecognition }));
});
