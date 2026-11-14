import assert from "node:assert/strict";
import { test } from "node:test";
import { DemoConversationProvider, LANGUAGES, TOPICS, demoProvider, makeMessage, openingLine } from "../src/features/conversation/engine.ts";

test("one offline demo provider, no paid provider configuration", () => {
  assert.equal(demoProvider.id, "offline-demo");
  assert.equal(demoProvider.isDemo, true);
  assert.ok(demoProvider instanceof DemoConversationProvider);
});

test("all supported languages and topics have opening prompts", () => {
  assert.equal(new Set(LANGUAGES.map((l) => l.code)).size, LANGUAGES.length);
  for (const language of LANGUAGES) for (const topic of TOPICS) {
    assert.ok(openingLine(language.code, topic.id).trim().length > 0);
  }
});

test("starting and sending produce typed demo prompts without false corrections", async () => {
  const first = makeMessage("tutor", openingLine("en", "travel"));
  const learner = makeMessage("learner", "I want to travel to Portugal");
  const reply = await demoProvider.reply({
    language: "en", level: "A2", topic: "travel", messages: [first, learner]
  }, new AbortController().signal);
  assert.equal(reply.text, "How do you usually travel?");
  assert.equal(reply.simulated, true);
  assert.deepEqual(reply.corrections, []);
  assert.deepEqual(reply.suggestions, []);
});

test("beginner and intermediate prompts differ after two turns", async () => {
  const messages = [makeMessage("learner", "Hello"), makeMessage("learner", "I work")];
  const beginner = await demoProvider.reply({ language: "en", level: "A1", topic: "work", messages }, new AbortController().signal);
  const intermediate = await demoProvider.reply({ language: "en", level: "B1", topic: "work", messages }, new AbortController().signal);
  assert.equal(beginner.text, "What do you enjoy about your work?");
  assert.equal(intermediate.text, "What would you change about your work?");
});

test("cancellation rejects an already-aborted request without a reply", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    demoProvider.reply({ language: "de", level: "A1", topic: "food", messages: [] }, controller.signal),
    /ABORTED/
  );
});

test("messages receive unique ids and the right roles", () => {
  const a = makeMessage("learner", "Hallo");
  const b = makeMessage("tutor", "Hallo!");
  assert.equal(a.role, "learner");
  assert.equal(b.role, "tutor");
  assert.notEqual(a.id, b.id);
  assert.ok(Number.isFinite(a.at));
});
