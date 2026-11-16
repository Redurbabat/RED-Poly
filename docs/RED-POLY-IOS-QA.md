# RED POLY – iPhone- und Release-Abnahme

## Stand und Sperre

Die Haupt-App bleibt die bestehende Expo-/React-Native-App. Das iOS-JavaScript-Bundle ist in GitHub Actions geprüft; **kein** nativer Xcode-Build, Simulatorlauf, signiertes IPA oder echter iPhone-Test ist nachgewiesen.

`app.json` und `eas.json` enthalten im Istzustand **fremde** Lingo-/Expo-/Apple-Identitäten. Sie werden **nicht automatisch überschrieben**. Eine App unter diesen Identitäten zu bauen, signieren oder verteilen ist bis zur Eigentümerentscheidung gesperrt.

## Sichere Vorbereitung auf dem eigenen Mac

1. Auf `agent/04-design-qa` oder später dem freigegebenen Integrationsstand arbeiten und `bun install --frozen-lockfile` ausführen.
2. `node scripts/release-identity-guard.cjs` ausführen. **Exit-Code 2 = BLOCKED** (der aktuelle Repository-Stand ist blockiert). `--audit` erzeugt lediglich einen nicht blockierenden Bericht für normale CI.
3. Eigene und bewusst bestätigte Angaben klären: Anzeigename, Expo-Slug, URL-Scheme, **eigene** iOS-Bundle-ID und Android-Package-ID, eigener Expo/EAS-Owner und EAS-Projekt-ID. Eine bestehende App darf nicht unabsichtlich durch geänderte IDs ersetzt werden. Fremde App-Store-Connect-ID entfernen; neue erst nach eigener Apple-App-Konfiguration zuordnen.
4. Für die tatsächliche Abnahme ausserdem Rechtekette von Lingo-Code, Kursen, Audio, Bildern, WordPecker und Mural prüfen. **Ein grüner Identitätscheck beweist keine Nutzungsrechte und ist keine Signierfreigabe.**
5. Erst nach diesen Voraussetzungen: Xcode-/Simulatorumgebung prüfen (`xcodebuild -version`, `xcrun simctl list devices available`), ein iOS-Development-Build über den eigenen Apple-Signierkontext erstellen, auf dem eigenen iPhone installieren und Kernfunktionen auf dem Gerät testen. Keinen EAS-Cloud-Build oder Store-Submit in diesem QA-PR starten.

## Manuelle iPhone-Checkliste (noch nicht ausgeführt)

- [ ] Korrekte Bundle-ID/Installations- und Update-Identität; kein fremdes Provisioning
- [ ] Start, bestehendes Onboarding, Kurswechsel, Lektion, Fortschritt, XP, SRS
- [ ] App im Flugmodus neu starten, vorhandene Offline-Lektionen/Audios nutzen und Fortschritt erhalten
- [ ] Optisches Glas auf unterstützter iOS-Version mit und ohne Reduce Transparency
- [ ] VoiceOver: Dialog-Fokus, Beschriftungen, Tabs und Fortschrittswerte
- [ ] Reduce Motion, Dark/Light, Dynamic Type und kleine iPhone-Displays
- [ ] Tastaturüberdeckung, Safe Areas, Statusleiste, Hintergrund-/Vordergrundwechsel
- [ ] Nach Testinstallations-Update: Persistenzschlüssel `progress-v2` weiterhin lesbar
- [ ] Erst dann: signierte IPA mit verantwortlichem Konto erstellen und Installation separat verifizieren

## Aussagekraft der automatischen Tests

`scripts/release-identity-guard.cjs` prüft nur offensichtliche, syntaktische und **bekannt fremde** Release-Identitäten. Er kann nicht verifizieren, wem ein EAS-/Apple-Konto tatsächlich gehört. In `--audit`-Modus läuft er rein lesend und endet selbst bei gesperrtem Release mit Exit-Code 0, damit Web-/QA-Änderungen weiter geprüft werden können. **Ohne `--audit`** schlägt er bei Problemen mit Exit-Code 2 fehl.

Die Browser-Screenshots und Expo-Bundle-Exporte ersetzen weder Simulator- noch Hardwaretests.
