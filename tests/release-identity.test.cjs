const { test } = require("node:test");
const assert = require("node:assert/strict");
const { checkReleaseIdentity } = require("../scripts/release-identity-guard.cjs");

function ownConfig() {
  return {
    expo: {
      name: "RED POLY",
      slug: "red-poly",
      scheme: "redpoly",
      owner: "own-eas-account",
      ios: { bundleIdentifier: "com.example.redpoly" },
      android: { package: "com.example.redpoly" },
      extra: { eas: { projectId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" } },
    },
  };
}

test("release guard rejects the imported Lingo identities without changing them", () => {
  const foreign = {
    expo: {
      name: "Lingo",
      slug: "lingo",
      scheme: "lingo",
      owner: "ahmet909",
      ios: { bundleIdentifier: "com.ahmet.lingo" },
      android: { package: "com.ahmet.lingo" },
      extra: { eas: { projectId: "c5e5ee9a-1aac-4b7c-ba0f-a97897c4d348" } },
    },
  };
  const issues = checkReleaseIdentity(foreign, {
    submit: { production: { ios: { ascAppId: "6781818623" } } },
  });
  assert.equal(issues.length, 8);
  assert.ok(issues.some((v) => v.field === "expo.ios.bundleIdentifier"));
  assert.ok(issues.some((v) => v.field === "eas.submit.production.ios.ascAppId"));
});

test("release guard permits a synthetic own-identity configuration", () => {
  assert.deepEqual(checkReleaseIdentity(ownConfig(), { submit: {} }), []);
});

test("release guard detects missing EAS project and Android package", () => {
  const own = ownConfig();
  delete own.expo.extra.eas.projectId;
  delete own.expo.android.package;
  const issues = checkReleaseIdentity(own, {});
  assert.deepEqual(issues.map((v) => v.field).sort(), [
    "expo.android.package",
    "expo.extra.eas.projectId",
  ]);
});
