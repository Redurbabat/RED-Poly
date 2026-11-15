// Expo SDK 56 flat ESLint configuration. Keep imported source trees excluded.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  expoConfig,
  {
    ignores: [
      "integrations/**",
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "web-build/**",
      "assets/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-debugger": "error",
      "no-constant-condition": "error",
    },
  },
];
