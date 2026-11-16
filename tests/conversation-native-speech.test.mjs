import assert from "node:assert/strict";
import { test } from "node:test";
import { createNativeSpeechSession } from "../src/features/conversation/native-speech.ts";

function mockRuntime(allowed = true) {
  const events = new Map();
  const data = { permissions: 0, starts: [], aborts: 0 };
  const on = (name, fn) => { events.set(name, fn); return () => events.delete(name); };
  return {
    data,
    emit(name, ...args) { events.get(name)?.(...args); },
    runtime: {
      async permission() { data.permissions++; return allowed; },
      listenStart: (fn) => on("start", fn),
      listenResult: (fn) => on("result", fn),
      listenError: (fn) => on("error", fn),
      listenEnd: (fn) => on("end", fn),
      start(lang) { data.starts.push(lang); },
      abort() { data.aborts++; },
    },
  };
}
const callbacks = (messages) => ({
  onStart() { messages.push("started"); },
  onText(text) { messages.push(text); },
  onError(code) { messages.push("error:" + code); },
  onEnd() { messages.push("ended"); },
});

test("native session constructor never asks permission or starts microphone", async () => {
  const mock = mockRuntime();
  const session = await createNativeSpeechSession("de-DE", callbacks([]), async () => mock.runtime);
  assert.equal(mock.data.permissions, 0);
  assert.equal(mock.data.starts.length, 0);
  session.abort();
  assert.equal(mock.data.aborts, 0);
});

test("native permission denial blocks recording and leaves session finished", async () => {
  const mock = mockRuntime(false);
  const events = [];
  const session = await createNativeSpeechSession("en-US", callbacks(events), async () => mock.runtime);
  await session.start();
  assert.equal(mock.data.permissions, 1);
  assert.deepEqual(mock.data.starts, []);
  assert.deepEqual(events, ["error:permission", "ended"]);
  await session.start();
  assert.equal(mock.data.permissions, 1);
});

test("native recognition returns only final text and stops on user abort", async () => {
  const mock = mockRuntime();
  const events = [];
  const session = await createNativeSpeechSession("fr-FR", callbacks(events), async () => mock.runtime);
  await session.start();
  assert.deepEqual(mock.data.starts, ["fr-FR"]);
  mock.emit("start");
  mock.emit("result", "interim", false);
  mock.emit("result", " Bonjour ", true);
  assert.deepEqual(events, ["started", "Bonjour"]);
  session.abort();
  session.abort();
  mock.emit("result", "should not appear", true);
  assert.deepEqual(events, ["started", "Bonjour"]);
  assert.equal(mock.data.aborts, 1);
});

test("native errors are categorized and cleanup prevents late callbacks", async () => {
  const mock = mockRuntime();
  const events = [];
  const session = await createNativeSpeechSession("de-DE", callbacks(events), async () => mock.runtime);
  await session.start();
  mock.emit("error", "network");
  mock.emit("result", "late", true);
  assert.deepEqual(events, ["error:network", "ended"]);
});

test("abort during pending native permission prevents microphone start", async () => {
  let release;
  const granted = new Promise((resolve) => { release = resolve; });
  const mock = mockRuntime();
  mock.runtime.permission = () => granted;
  const session = await createNativeSpeechSession("en-US", callbacks([]), async () => mock.runtime);
  const pending = session.start();
  session.abort();
  release(true);
  await pending;
  assert.deepEqual(mock.data.starts, []);
});
