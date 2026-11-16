# RED POLY – Design & QA

## Verbindlicher Umfang
- Gemeinsame Bibliothek: `src/components/red-poly-ui.tsx`. Ausschliesslich UI; keine Änderungen am Fortschrittsspeicher.
- Exportiert: `PolyButton`, `PolyCard`, `PolyTextField`, `PolyNavItem`, `PolyDialog`, `PolyLoading`, `PolyError`, `PolyProgress`, `PolyGlassSurface`, `usePolyMotion`.
- Verwendung: `import { PolyButton } from "@/components/red-poly-ui"`.
- Die bestehenden `DuoButton` und Expo-Router-Tabs bleiben unverändert. Feature-Agenten können schrittweise umstellen.
- Farben aus `src/lib/theme.ts`, Systempräferenz und bestehende Nutzereinstellung. Mindesthöhe interaktiver Elemente 44 pt.
- Glas: `PolyGlassSurface` enthält jetzt `GlassView` aus dem bereits installierten `expo-glass-effect` 56.0.4, **nur** falls `isLiquidGlassAvailable()` und `isGlassEffectAPIAvailable()` auf iOS zustimmen und Reduce Transparency deaktiviert ist. Ältere iOS-Versionen, Android, Web und Reduce Transparency nutzen eine lesbare View-Fallback-Oberfläche. **Die native Darstellung ist noch nicht auf einem echten iPhone geprüft.** Quelle: [Expo SDK 56 GlassEffect](https://docs.expo.dev/versions/v56.0.0/sdk/glass-effect/).
- Motion: `usePolyMotion` liefert Dauerwerte und respektiert Reduce Motion. Es startet selbst keine Daueranimation.
- Dialog: native `Modal`, Android-Back über `onRequestClose`; tatsächliche VoiceOver-Fokusführung noch manuell prüfen.

## Automatische Qualität
- `.github/workflows/quality.yml`: GitHub PR -> `main` (sowie Branch-Push und manuell). Frozen Bun-Lockfile, TypeScript, gesamte Expo-App (`src`) mit ESLint-Fehlerprüfung, strengere neue UI-Primitive, Node Unit-/Strukturtests, Expo-Web-Export und PR-Diffcheck.
- **ESLint-Startumfang:** Root `eslint.config.js` nutzt das offizielle `eslint-config-expo/flat` 56.0.4. GitHub Actions installiert `eslint@9.39.1` + `eslint-config-expo@56.0.4` mit `bun add --no-save` **nach** dem unveränderten Frozen-Lockfile-Install. Somit wird der bestehende App-Lockfile nicht geändert. ESLint prüft den gesamten Root-Expo-Code unter `src/` auf Fehler mit `bunx eslint src --quiet`. Für die neue UI-Bibliothek gelten zusätzlich null Warnungen (`--max-warnings=0`). Die importierten `integrations/` bleiben ausgeschlossen. Für lokale Ausführung: `bun install --frozen-lockfile && bun add --no-save --ignore-scripts eslint@9.39.1 eslint-config-expo@56.0.4 && bunx eslint src/components/red-poly-ui.tsx --max-warnings=0`. Drei bestehende React-Hooks-Fehler werden vorübergehend **nur** in `src/app/_layout.tsx` (`set-state-in-effect`) sowie `src/app/lesson/[id].tsx` (`set-state-in-effect`, `refs`) ausgenommen; alle anderen Regeln prüfen die Dateien weiterhin. Diese Ausnahmen später durch die zuständigen App-/Feature-Agenten nach Funktionstests abbauen. Warnungen im Altcode sowie das dauerhafte Einpflegen der ESLint-Pakete ins Bun-Lockfile bleiben offen.
- Test: `node --test tests/*.test.cjs`; SRS-Logik wird aus der realen TypeScript-Datei transpiliert und geprüft, ausserdem Persistenzschlüssel und UI-Exports.
- Kein Release, keine Signierung, keine Cloud-Kosten.

## Plattformmatrix / Release-Sperren
| Plattform | Quellstand | In diesem PR getestet? |
| --- | --- | --- |
| iPhone | Expo + Router + RN, native Device-Prüfung ausstehend | Nein |
| Android | Expo + Router + RN, Emulator ausstehend | Nein |
| Web | React Native Web, Expo-Export in CI erfolgreich; Browser- und UI-Test ausstehend | **Export erfolgreich, Browser nein** |
| Windows | spätere Desktop-Strategie; keine zweite App | Nein |
| macOS | spätere Desktop-Strategie; keine zweite App | Nein |

**IPA erst nach:** bestätigter eigener Bundle-ID und Expo-/EAS-Owner/Projekt-ID; Rechte- und Lizenzprüfung von übernommenem Code/Audio; Apple-Signierung/Provisioning; EAS- oder Xcode-Build; Installations-, Offline-, Update-, Accessibility- und Regressionstests auf echtem iPhone.

## Vor manueller Abnahme
Prüfen: Tastaturüberdeckung, iPhone-Safe-Areas, Statusleiste, kleine Displays, Dynamic Type, VoiceOver-Fokus bei Modalöffnung, Android TalkBack, Reduce Motion, Reduce Transparency, Farbschema, Touch-Targets, SRS/XP/Offline-Neustart.

## Bestätigte CI-Nachweise (15.11.2026)
- Run [43728283309](https://github.com/Redurbabat/RED-Poly/actions/runs/43728283309), Commit `69139a0`: Frozen-Lockfile-Installation, TypeScript, Expo-ESLint für neue UI-Komponenten sowie 4 von 4 Node-Tests erfolgreich.
- Run [43728412343](https://github.com/Redurbabat/RED-Poly/actions/runs/43728412343), Commit `46300f2`: dieselben Prüfungen erfolgreich, zusätzlich `bunx expo export --platform web --output-dir .ci-web-build` erfolgreich. Metro hat 2435 Web-Module und 12 statische Routen gebündelt.
- **Nicht nachgewiesen:** Browser-Interaktion, Offline-Web-Verhalten, iOS-/Android-Simulator, reale Geräte, Windows/macOS-Native-Pakete, IPA-Signierung und vollständiges Root-ESLint.

## ESLint-Baseline: bestehende Fehler (16.11.2026)
- Voller Scan `bunx eslint src --quiet` in Run [43812228221](https://github.com/Redurbabat/RED-Poly/actions/runs/43812228221) fand genau 3 Fehler: `src/app/_layout.tsx:18` (State-Update im Effect), `src/app/lesson/[id].tsx:228` (dito), `src/app/lesson/[id].tsx:274` (Ref-Zugriff während Render).
- Ausnahmen sind **datei- und regelspezifisch**, keine globalen Deaktivierungen. Keine der betreffenden App-/Lern-Dateien wird hier geändert. Die Featureverantwortlichen müssen die Ursachen korrigieren, bevor diese Ausnahmen entfernt werden.
- Der neue native Glas-Code ist lediglich compile-/bundle-geprüft; tatsächliches Aussehen und Accessibility auf iOS 26 bleiben **NICHT GETESTET**.
