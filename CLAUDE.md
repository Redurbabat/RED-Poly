# RED POLY — CLAUDE.md

**Stand:** 14.11.2026 · **Status:** Verbindliche Arbeitsregeln für Coding-Agenten, nicht der Nachweis einer fertigen Integration.

RED POLY ist die eigenständige Sprachlern-App der RED-Markenfamilie. Der bereits übernommene **Lingo-Lessons-Mobilcode** ist die einzige laufende Haupt-App. Die Quellprojekte **WordPecker** und **Mural** liegen unter `integrations/` als Referenzen und Integrationsquellen. Sie sind **noch nicht** Teil eines gemeinsamen Produktablaufs. Nichts als fertig, getestet oder integriert bezeichnen, solange der Nachweis fehlt.

## Einstieg – vor jedem Auftrag [hart]

1. `git status --short --branch`, `git log -5 --oneline`, aktuellen Branch und offene PRs prüfen. Fremde, nicht committete Änderungen nicht überschreiben.
2. `CLAUDE.md`, `ENTSCHEIDUNGEN.md` und `ARCHITEKTUR.md` lesen. Danach die tatsächlich betroffenen Dateien, bestehenden Funktionen, Fehler und Tests ansehen.
3. Auftrag in kleinste überprüfbare Schritte teilen. Vor neuer Architektur erst in `src/` und `integrations/` nach vorhandener Umsetzung suchen.
4. Ein Agent = ein begrenzter Verantwortungsbereich. Bei parallelen Chats/Agenten ein gemeinsames PR-Ziel und konkrete Dateibesitzer festlegen; dieselbe Datei nicht parallel blind bearbeiten.
5. Vor und nach jeder Änderung prüfen: Was funktioniert wirklich? Was ist nur Quellcode, Planung, simuliert oder **NICHT GETESTET**?

## Unverhandelbare Regeln [hart]

### Projektidentität und Umfang

- **Anzeigename: RED POLY.** GitHub: `Redurbabat/RED-Poly`. Nicht auf „Lingo“, „Mural“ oder „WordPecker“ zurückbenennen.
- **Ein Produkt, eine Hauptnavigation, ein Lernfortschritt.** `src/app/` / Expo Router ist der existierende Einstieg. Keine drei konkurrierenden Apps, Store-Instanzen oder Anmeldesysteme in der Oberfläche.
- Bestehenden Lingo-Lessons-Code erhalten und schrittweise verbessern; vor einem Umbau die auslösende Einschränkung und den Test notieren. Änderungen an Code aus `integrations/` sind gesondert zu begründen.
- Die Repositories **RED-Bit**, **Redion** und **RED-Morph** sind nur Inspirations- bzw. Regelquellen; **dort nichts ändern**. Spezifische Audio-/Player-Regeln aus RED-Bit nicht unbesehen auf eine Sprachlern-App übertragen.

### Datensicherheit und Offline-Verhalten

- Lernergebnisse gehören dem Nutzer. Offline-Kurse, XP, Lektionen, Serien, Fehlerhistorie und Wiederholungen dürfen durch Features, Migrationen, Updates oder Abbruch nicht verloren gehen.
- Aktueller Bestand: `src/lib/store.ts` verwendet Zustand + AsyncStorage unter dem Schlüssel `progress-v2` mit älterer Migrationslogik. **Diesen Schlüssel nicht umbenennen oder löschen**, bevor ein nachweisbarer Migrations- und Restore-Test vorhanden ist.
- Niemals Storage „zur Reparatur“ löschen oder eine App deinstallieren, ohne Nutzerfreigabe und belastbare Sicherung. Bei Schemawechseln: Version, rückwärtskompatibles Lesen, idempotente Migration und Abbruchtest.
- Lernen mit bereits gebündelten Kursen muss ohne Konto, Server und Netz funktionieren. Neue KI-Funktionen dürfen das nicht brechen.
- Mikrofon, Spracherkennung, KI-Upload und Cloud-Synchronisierung nur nach klarer Nutzeraktion und transparenter Erklärung. Keine Sprachaufnahmen oder Lernprofile stillschweigend an Drittanbieter senden.
- Keine Tokens, privaten Aufnahmen, Nutzerdaten, Zertifikate, Signaturdateien, EAS-/Apple-Secrets oder echte Diagnosedaten in Git, Logs, Screenshots oder Test-Fixtures.

### Fremdcode und Lizenzen

- Jede Übernahme braucht **Quell-URL, Commit/Version, Lizenz, Copyright, Daten-/Asset-Herkunft, Zweck, Änderungen und Integrationsgrenze**. Bestehende `LICENSE`- und Quellhinweise erhalten. Keine Marken, Bilder, TTS-Dateien oder Kursinhalte als automatisch mitlizenziert annehmen.
- **Bekannter offener Lizenzpunkt:** Die Root-`LICENSE` nennt derzeit Expo/650 Industries, nicht nachweislich alle Rechteinhaber des übernommenen Lingo-Lessons-Appcodes. Die vollständige Lizenz- und Content-Provenienz vor Veröffentlichung klären; die beiden Unterordner enthalten eigene MIT-Lizenzen.
- `integrations/wordpecker` und `integrations/mural` sind derzeit importierter Quellcode, **kein** freigegebener Laufzeitbestandteil. Keine fremden Backend-/Zahlungs-/Account-Module ohne Prüfung aktivieren.
- Vor *weiteren* externen Code- oder Asset-Imports Zustimmung des Repository-Eigentümers einholen. Bei grossen Fremdcodeänderungen die Herkunft nachvollziehbar halten.

### Git und Agentenzusammenarbeit

- Vor Arbeit Stand prüfen; pro Auftrag ein `feature/`-, `fix/`- oder `docs/`-Branch. **Nicht direkt auf `main` committen**, nicht eigenständig mergen, keinen Force-Push, Hard Reset oder pauschales Clean.
- Wenn mehrere Agenten dasselbe Ziel verfolgen, **eine gemeinsame Integrations-PR** koordinieren, statt widersprüchliche PRs zu mergen. Kein Branch eines anderen Agenten überschreiben.
- Kleine, prüfbare Diffs; keine unaufgeforderten Redesigns, Umbenennungen, großen Paketupdates oder Quellcode-Löschungen. Änderungen auf `main` nur durch Freigabe/Merge des Eigentümers.
- Vor jedem Push `git diff --check`, `git diff --cached` und Branch prüfen. PR enthält: Ziel, betroffene Bereiche, Nachweis, Risiken und offene Aufgaben.

### Plattformen, Design und Sprache

- Tatsächlicher Stack: **Expo SDK 56 + React Native + Expo Router + TypeScript**; iOS, Android und Web sind die unmittelbaren Ziele. **Windows/macOS-Desktop sind Zukunftsziele**, keine bestätigten nativen Builds.
- Ein konsistentes RED-Morph-Design: ruhiges Optical Glass, semantische Farben, saubere Hierarchie, keine Neon-Glow-Effekte, keine doppelte Navigation und keine rein dekorativen Interaktionen. Vorhandene Komponenten bevorzugen.
- Plattformkonforme Safe Areas, Tastatur, Touch-Targets, Hell/Dunkel, Screenreader, Schriftvergrößerung und „Reduce Motion“ beachten. Native Effekte nur mit funktionsfähigem Fallback.
- **Deutsch** ist die Standardsprache für Agentendokumentation und Kommunikation; Code-Identifiers, Schnittstellen und Datenfeldnamen auf Englisch. In deutschsprachigen Texten `ss` statt `ß`.
- Unterrichtssprachen strikt von UI-Sprache trennen. Kurmancî und Sorani sind unterschiedliche Sprachen/Varianten mit gesonderter Inhaltsprüfung. KI-Antworten nicht als redaktionell geprüfte Lektionen ausgeben.

### Build- und Veröffentlichungsgrenzen

- In `app.json` stehen **noch fremde Bezeichner** (u. a. `Lingo`, `com.ahmet.lingo`, Expo-Owner und EAS-Projekt-ID); `eas.json` enthält eine fremde App-Store-ID. **Keine EAS-Builds, Store-Submissions oder Veröffentlichungen unter fremder Identität.** Umstellung auf eigene Identität als separate, geprüfte Aufgabe.
- Für Cloud-KI: Nutzereinwilligung, getrennte Credentials, Kostenlimits, Lösch- und Fehlerpfad, sichere Speicherung und Offline-Fallback. **ChatGPT Plus ist kein API-Guthaben.**
- Builds, IPA/APK, Simulatorläufe, echte Geräteprüfungen und veröffentlichte Releases immer getrennt ausweisen.

## Arbeits- und Testverfahren [hart]

1. Reproduzieren oder Istzustand dokumentieren; bei Bugs möglichst zuerst den fehlschlagenden Test.
2. Änderung entlang bestehender Architektur und Datengrenzen implementieren. Importierten Code zuerst auf fachliche Logik reduzieren; UI nicht unbesehen kopieren.
3. Abhängig vom Bereich überprüfen, zum Beispiel:
   - `bun install --frozen-lockfile` (wenn passende Bun-Version und Lockfile vorhanden)
   - `bunx tsc --noEmit` (Typprüfung)
   - `bunx expo start --web` (manueller Web-Flow; Start allein ist kein UI-Test)
   - iOS-/Android-Simulator und echtes Gerät separat (nur wenn tatsächlich ausgeführt)
   - Datenmigration, Offline-Neustart, Kurswechsel, SRS, Audio und Accessibility als zielgerichtete Regression.
4. Bericht enthält pro Prüfung den **Befehl, tatsächliches Ergebnis, Commit, Plattform und offene Risiken**. Ohne Ausführung ausdrücklich **NICHT GETESTET** schreiben.
5. Dokumentation bei Änderungen aktualisieren: `ARCHITEKTUR.md` bei Struktur, `ENTSCHEIDUNGEN.md` bei Grundsatzentscheidung, `CLAUDE.md` bei neuer verbindlicher Regel.

## Prioritäten [Richtwert]

**P0:** Datenverlust, Geheimnisse, falsche Repository-/Store-Identität, unklare Rechte.
**P1:** Lauffähige Haupt-App, bestehende Lektionen/Audio/SRS, reproduzierbare Tests.
**P2:** WordPecker-Vokabelfunktionen *integrieren*, danach Mural-Gespräche *integrieren*.
**P3:** RED-Morph-Design, weitere Sprachen, Desktop-Verpackung und optionale Cloud.

**Fertig** bedeutet: umgesetzt, keine bestehende Funktion stillschweigend verloren, passende Prüfungen bestanden, Restgrenzen dokumentiert. Eine PR oder ein erzeugtes Artefakt allein bedeutet nicht „fertig“.

## Herkunft dieser Regeln

Für RED POLY fachlich angepasst aus den **gelesenen** Projektregeln von `Redurbabat/RED-Bit` (`AGENTS.md`, `docs/AGENT_WORKFLOW.md`, `docs/DATENREGELN.md`, `docs/DESIGN_SYSTEM.md`, `docs/TESTPLAN.md`) und `Redurbabat/Redion` (`CLAUDE.md`, `AGENTS.md`, `FREMDCODE.md`, `doku/ARCHITEKTUR.md`, `doku/AGENT_WORKFLOW.md`). Diese Dokumente werden **nicht** als RED-POLY-Code kopiert oder unverändert als technische Anforderungen übernommen.
