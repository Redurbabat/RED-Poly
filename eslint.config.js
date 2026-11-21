// Expo SDK 56 flat ESLint configuration. Keep imported source trees excluded.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...(Array.isArray(expoConfig) ? expoConfig : [expoConfig]),
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
  // Baseline aus der importierten Lingo-App: keine Änderungen an Feature-Dateien.
  // Die übrigen Regeln laufen auch in diesen zwei Dateien weiter.
  {
    files: ["src/app/_layout.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    files: ["src/app/lesson/[[]id[]].tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
];
