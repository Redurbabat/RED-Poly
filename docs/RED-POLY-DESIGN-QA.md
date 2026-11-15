# RED POLY – Design & QA

## Verbindlicher Umfang
- Gemeinsame Bibliothek: `src/components/red-poly-ui.tsx`. Ausschliesslich UI; keine Änderungen am Fortschrittsspeicher.
- Exportiert: `PolyButton`, `PolyCard`, `PolyTextField`, `PolyNavItem`, `PolyDialog`, `PolyLoading`, `PolyError`, `PolyProgress`, `PolyGlassSurface`, `usePolyMotion`.
- Verwendung: `import { PolyButton } from "@/components/red-poly-ui"`.
- Die bestehenden `DuoButton` und Expo-Router-Tabs bleiben unverändert. Feature-Agenten können schrittweise umstellen.
- Farben aus `src/lib/theme.ts`, Systempräferenz und bestehende Nutzereinstellung. Mindesthöhe interaktiver Elemente 44 pt.
- Glas: gegenwärtig kontrastschonende semitransparente Oberfläche mit Plattform-/Reduce-Transparency-Fallback; **keine** Behauptung eines nativen iOS-GlassViews. Optionaler nativer Expo-Glass-Adapter erst nach Gerätetest.
- Motion: `usePolyMotion` liefert Dauerwerte und respektiert Reduce Motion. Es startet selbst keine Daueranimation.
- Dialog: native `Modal`, Android-Back über `onRequestClose`; tatsächliche VoiceOver-Fokusführung noch manuell prüfen.

## Automatische Qualität
- `.github/workflows/quality.yml`: GitHub PR -> `main` (sowie Branch-Push und manuell). Bun-Lockfile-Installation, TypeScript, vorhandenes ESLint falls konfiguriert, Node Unit- und Strukturtests, PR-Diffcheck.
- **ESLint-Startumfang:** Root `eslint.config.js` nutzt das offizielle `eslint-config-expo/flat` 56.0.4. GitHub Actions installiert `eslint@9.39.1` + `eslint-config-expo@56.0.4` mit `bun add --no-save` **nach** dem unveränderten Frozen-Lockfile-Install. Somit wird der bestehende App-Lockfile nicht geändert. Die Lint-Prüfung ist auf die neue gemeinsame UI-Bibliothek begrenzt, da die importierten Referenzprojekte andere Toolchains besitzen. Für lokale Ausführung: `bun install --frozen-lockfile && bun add --no-save --ignore-scripts eslint@9.39.1 eslint-config-expo@56.0.4 && bunx eslint src/components/red-poly-ui.tsx --max-warnings=0`. Es handelt sich um eine echte ESLint-Prüfung, nicht um einen Skip. Die vollständige Root-App-Lintabdeckung und das dauerhafte Einpflegen der Lint-Pakete ins Bun-Lockfile bleiben offen.
- Test: `node --test tests/*.test.cjs`; SRS-Logik wird aus der realen TypeScript-Datei transpiliert und geprüft, ausserdem Persistenzschlüssel und UI-Exports.
- Kein Release, keine Signierung, keine Cloud-Kosten.

## Plattformmatrix / Release-Sperren
| Plattform | Quellstand | In diesem PR getestet? |
| --- | --- | --- |
| iPhone | Expo + Router + RN, native Device-Prüfung ausstehend | Nein |
| Android | Expo + Router + RN, Emulator ausstehend | Nein |
| Web | React Native Web, Browser-Test ausstehend | Nein |
| Windows | spätere Desktop-Strategie; keine zweite App | Nein |
| macOS | spätere Desktop-Strategie; keine zweite App | Nein |

**IPA erst nach:** bestätigter eigener Bundle-ID und Expo-/EAS-Owner/Projekt-ID; Rechte- und Lizenzprüfung von übernommenem Code/Audio; Apple-Signierung/Provisioning; EAS- oder Xcode-Build; Installations-, Offline-, Update-, Accessibility- und Regressionstests auf echtem iPhone.

## Vor manueller Abnahme
Prüfen: Tastaturüberdeckung, iPhone-Safe-Areas, Statusleiste, kleine Displays, Dynamic Type, VoiceOver-Fokus bei Modalöffnung, Android TalkBack, Reduce Motion, Reduce Transparency, Farbschema, Touch-Targets, SRS/XP/Offline-Neustart.
