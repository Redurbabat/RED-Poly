# RED POLY – Design & QA

## Verbindlicher Umfang
- Gemeinsame Bibliothek: `src/components/red-poly-ui.tsx`. Ausschliesslich UI; keine Änderungen am Fortschrittsspeicher.
- Exportiert: `PolyButton`, `PolyCard`, `PolyTextField`, `PolyNavItem`, `PolyDialog`, `PolyLoading`, `PolyError`, `PolyProgress`, `PolyGlassSurface`, `usePolyMotion`.
- Verwendung: `import { PolyButton } from "@/components/red-poly-ui"`.
- Die bestehenden `DuoButton` und Expo-Router-Tabs bleiben unverändert. Feature-Agenten können schrittweise umstellen.
- Farben aus `src/lib/theme.ts`, Systempräferenz und bestehende Nutzereinstellung. Mindesthöhe interaktiver Elemente 44 pt.
- Glas: `PolyGlassSurface` enthält jetzt `GlassView` aus dem bereits installierten `expo-glass-effect` 56.0.4, **nur** falls `isLiquidGlassAvailable()` und `isGlassEffectAPIAvailable()` auf iOS zustimmen und Reduce Transparency deaktiviert ist. Ältere iOS-Versionen, Android, Web und Reduce Transparency nutzen eine lesbare View-Fallback-Oberfläche. **Die native Darstellung ist noch nicht auf einem echten iPhone geprüft.** Quelle: [Expo SDK 56 GlassEffect](https://docs.expo.dev/versions/v56.0.0/sdk/glass-effect/).
- Motion: `usePolyMotion` liefert Dauerwerte und respektiert Reduce Motion. Es startet selbst keine Daueranimation.
- Dialog: native `Modal`, Android-Back über `onRequestClose`, `accessibilityViewIsModal`, iOS-`KeyboardAvoidingView`; bei Reduce Motion wird die Einblendung deaktiviert. Tatsächliche VoiceOver-Fokusführung und Bildschirmtastatur noch manuell prüfen.

## Automatische Qualität
- `.github/workflows/quality.yml`: GitHub PR -> `main` (sowie manuell per Workflow-Dispatch). Frozen Bun-Lockfile, TypeScript, gesamte Expo-App (`src`) mit ESLint-Fehlerprüfung, strengere neue UI-Primitive, Node Unit-/Strukturtests, Expo-Web-/iOS-/Android-JavaScript-Export und PR-Diffcheck.
- **ESLint-Startumfang:** Root `eslint.config.js` nutzt das offizielle `eslint-config-expo/flat` 56.0.4. GitHub Actions installiert `eslint@9.39.1` + `eslint-config-expo@56.0.4` mit `bun add --no-save` **nach** dem unveränderten Frozen-Lockfile-Install. Somit wird der bestehende App-Lockfile nicht geändert. ESLint prüft den gesamten Root-Expo-Code unter `src/` auf Fehler mit `bunx eslint src --quiet`. Für die neue UI-Bibliothek gelten zusätzlich null Warnungen (`--max-warnings=0`). Die importierten `integrations/` bleiben ausgeschlossen. Für lokale Ausführung: `bun install --frozen-lockfile && bun add --no-save --ignore-scripts eslint@9.39.1 eslint-config-expo@56.0.4 && bunx eslint src/components/red-poly-ui.tsx --max-warnings=0`. Drei bestehende React-Hooks-Fehler werden vorübergehend **nur** in `src/app/_layout.tsx` (`set-state-in-effect`) sowie `src/app/lesson/[id].tsx` (`set-state-in-effect`, `refs`) ausgenommen; alle anderen Regeln prüfen die Dateien weiterhin. Diese Ausnahmen später durch die zuständigen App-/Feature-Agenten nach Funktionstests abbauen. Warnungen im Altcode sowie das dauerhafte Einpflegen der ESLint-Pakete ins Bun-Lockfile bleiben offen.
- Test: `node --test tests/*.test.cjs`; SRS-Logik wird aus der realen TypeScript-Datei transpiliert und geprüft, ausserdem Persistenzschlüssel und UI-Exports.
- Kein Release, keine Signierung, keine Cloud-Kosten.

## Plattformmatrix / Release-Sperren
| Plattform | Quellstand | In diesem PR getestet? |
| --- | --- | --- |
| iPhone | Expo Router / React Native, iOS-JS-Export in CI erfolgreich; Xcode/Simulator/Hardware nicht geprüft | **JS-Bundle ja; native App nein** |
| Android | Expo Router / React Native, Android-JS-Export in CI erfolgreich; Gradle/Emulator/Hardware nicht geprüft | **JS-Bundle ja; native App nein** |
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

## Multi-Plattform-Bundle-Nachweis (16.11.2026)
- [Run 43812894282](https://github.com/Redurbabat/RED-Poly/actions/runs/43812894282), Commit `58a7e5e`, **alle Schritte bestanden**: Frozen Bun-Lockfile, TypeScript, ESLint gesamtes `src/` (mit zwei dokumentierten Datei-/Regelausnahmen), ESLint UI-Bibliothek strikt, **6/6** Node-Tests, Expo JS Exports für **Web, iOS und Android**, PR-Diffcheck.
- `bunx expo export --platform ios --output-dir .ci-ios-bundle` und `bunx expo export --platform android --output-dir .ci-android-bundle` sind **nur Metro/JS-Bundle-Smoke-Tests**, keine IPA/APK/Simulator-/Geräteprüfung und keine Validierung nativer GlassView-Darstellung.
- Künftige CI nur pro Pull Request (plus manuelle Ausführung), um doppelte Jobs bei Branch-Push und PR zu vermeiden.

## Barrierefreiheits-Fallbacks (16.11.2026)
- Reduce Transparency und Reduce Motion starten konservativ als **aktiv**, bis `AccessibilityInfo` die tatsächliche Einstellung ausgelesen hat. So erscheint nicht kurz native Glastransparenz oder Animation bei noch ungeklärter OS-Vorgabe.
- `PolyDialog` schaltet seine Modal-Animation bei Reduce Motion auf `none`, markiert den Dialog als Accessibility-Modal und nutzt `KeyboardAvoidingView` auf iOS. Ein echter iPhone-/VoiceOver-/Tastaturtest steht weiterhin aus.
- Strukturtests für die Startzustände und Dialogeigenschaften ergänzt. Diese Tests ersetzen keine Geräte- oder Renderprüfungen.

## Design Lab im Entwicklungsmodus (16.11.2026)
- Neue isolierte Route `src/app/design-lab.tsx` als praktische Vorschau aller 10 UI-Bausteine. Aufruf bei gestarteter Expo-Entwicklung: `/design-lab`, im Web üblicherweise `http://localhost:8081/design-lab` (Port laut Expo-Konsolenausgabe). **Kein zusätzlicher Tab, kein eigener Lernstand und keine Änderung an den Lern-Screens.**
- Die Route zeigt interaktive Buttons, Deaktivierung, Ladezustand, Fehlermeldung mit Wiederholung, ein Eingabefeld mit Validierungsfehler, Auswahl, veränderbaren Fortschritt, Glasoberfläche und einen bestätigbaren/abbrechbaren Dialog.
- **In Produktions-Builds:** sofortige Weiterleitung zu `/(tabs)` über `__DEV__`; die Route ist nicht als separates Produktmerkmal gedacht. Ein Test im Browser oder auf Hardware muss separat durchgeführt werden.
- Manueller QA-Durchlauf: hell/dunkel, kleine Bildschirme, vergrösserte Schrift, Tastaturüberdeckung, Dialog-Fokus, Reduce Motion, Reduce Transparency und Screenreader. Ergebnisse erst nach Durchführung als bestanden markieren.

## Realer Browser-Interaktionstest (in CI angelegt)
- `tests/design-lab.browser.cjs` startet Chromium über Playwright bei einem echten Expo-Entwicklungsserver. Der Test durchläuft zunächst **die bestehende Onboarding-Oberfläche** (ohne Mock-Store/Umgehung), öffnet dann `/design-lab` und prüft Klicks, Textvalidierung, Dialog bestätigen/abbrechen, deaktivierte Buttons, Tab-Auswahl, Progress-Wert und Retry.
- Zusätzlich werden mobile (390 × 844) und Desktop-Ansichten (1280 × 800) als Screenshots erfasst und als GitHub-Actions-Artefakt `red-poly-design-lab-browser` hochgeladen. Die Laufzeit-Tools `playwright@1.56.1` und Chromium werden nur in CI installiert, ohne das bestehende Bun-Lockfile zu verändern.
- Der Test soll echte Web-Interaktionen überprüfen, **nicht** iOS-/Android-Touchverhalten, VoiceOver oder native Liquid-Glass-Darstellung. Ergebnis erst nach erfolgreich beendetem Workflow als bestanden bezeichnen.

- Erster Browser-CI-Versuch [43816359138](https://github.com/Redurbabat/RED-Poly/actions/runs/43816359138) erreichte den Browser-Test nicht: `curl` fragte ausschliesslich `127.0.0.1:8081` ab, Expo meldete nur `localhost:8081` (IPv4-/IPv6-Bindung). Zusätzlich erschien eine nicht blockierende Fehlermeldung zum Linux-Sandbox-Helper des React Native DevTools. Beide lokalen URLs für Test und Readiness-Check auf `localhost` ausgerichtet und Portdiagnose im Fehlerfall ergänzt. **Kein Browser-Test-Erfolg aus dem fehlgeschlagenen Run behauptet.**

## Browser-Testbefund: Tab-Auswahl (16.11.2026)
- Der erstmals tatsächlich ausgeführte Chromium-Test [43817287097](https://github.com/Redurbabat/RED-Poly/actions/runs/43817287097) konnte die bestehende Onboarding-Route, die Design-Testseite, Buttons, deaktivierte Aktionen, Modal-Dialoge sowie Validierungsfehler real bedienen. An der `PolyNavItem`-Auswahl scheiterte die Prüfung: trotz `accessibilityState.selected` wurde in React Native Web **kein** `aria-selected`-Attribut ausgegeben.
- `PolyNavItem` setzt deshalb nun `aria-selected={!!selected}` zusätzlich zum nativen Accessibility-State. Diese Änderung wird durch einen Strukturtest und den realen Chromium-Interaktionstest abgesichert.
- Der Screenshot-Upload der CI aktiviert `include-hidden-files: true`, weil die Artefakte bewusst im isolierten Ordner `.ci-browser-artifacts/` gespeichert werden.

- Chromium-Lauf [43817711980](https://github.com/Redurbabat/RED-Poly/actions/runs/43817711980) bestätigt: Onboarding, Buttons, Dialoge, Validierung und die reparierte Tab-Auswahl funktionieren. Danach zeigte er einen weiteren ARIA-Mangel: `PolyProgress` setzte nur `accessibilityValue`, React Native Web stellte aber keinen `aria-valuenow` bereit. **Korrektur:** explizite `aria-valuemin`, `aria-valuemax`, `aria-valuenow` zusätzlich zum nativen `accessibilityValue`. Der erste tatsächliche Screenshot des mobilen Testdialogs wurde im Workflow als Artefakt gespeichert.

## Erweiterte Chromium-Abnahme (16.11.2026)
- Der Chromium-End-to-End-Test prüft neu zusätzlich einen **320 × 568 px** schmalen Bildschirm gegen horizontales Überlaufen, die **Tastaturaktivierung** eines Dialogs mit Enter und die echte **Dark-Mode-Umschaltung** über die bestehenden Profileinstellungen. Keine Änderungen an Lern- oder Profile-Screens.
- Neue separate Screenshots: `small-mobile-design-lab.png`, `dark-mobile-design-lab.png`; sie liegen mit den bestehenden Screenshots im GitHub-Actions-Artefakt. Resultate erst nach erfolgreichem Run als bestätigt markieren.
- Das ist eine Browser-Abnahme, **keine** VoiceOver-, iOS-Simulator- oder iPhone-Hardware-Abnahme.

## Release-Vorflugpruefung ohne Build (16.11.2026)
- Neu: `scripts/release-identity-guard.cjs` vergleicht die aktuellen App- und EAS-Metadaten mit Mindestanforderungen und erkannten fremden Lingo-/EAS-/Apple-Identitäten. Ohne Parameter **Exit 2 bei gesperrtem Release**. `--audit` protokolliert die Probleme in normaler PR-CI ohne einen iPhone-Build zu starten.
- Drei Unit-Tests mit synthetischen eigenen und fremden Identitäten (`tests/release-identity.test.cjs`); unveränderte `app.json` und `eas.json`.
- Die genaue, manuelle Reihenfolge für Mac/iPhone steht in `docs/RED-POLY-IOS-QA.md`. **Es wurde keine IPA gebaut oder signiert.**
