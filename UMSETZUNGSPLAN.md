# RED POLY — UMSETZUNGSPLAN

**Stand:** 14.11.2026 · **Status:** Arbeitsplan, kein Nachweis abgeschlossener Produktfunktionen.
**Hauptrepository:** `Redurbabat/RED-Poly`
**Verbindliche Grundlagen:** [CLAUDE.md](CLAUDE.md) · [ENTSCHEIDUNGEN.md](ENTSCHEIDUNGEN.md) · [ARCHITEKTUR.md](ARCHITEKTUR.md)

## Ziel und Abnahme

**Eine** moderne Sprachlern-App namens RED POLY. Die vorhandene Lingo-Lessons-Expo-App bleibt die einzige Haupt-App. Funktionen von WordPecker (eigene Wortlisten, Vokabeln) und Mural (konversationelles Lernen) werden selektiv in die Haupt-App integriert. Kein neues App-Skelett, keine getrennte WordPecker-/Mural-Navigation, kein obligatorischer Cloud-Account.

**Ein Feature gilt erst als fertig**, wenn es in der RED-POLY-App erreichbar ist, den vorhandenen Fortschritt respektiert, bei Fehlern und ohne Internet sinnvoll reagiert und die betroffenen Prüfungen dokumentiert bestanden hat.

## Istzustand — überprüft im GitHub-Quellbestand

- [x] Haupt-App liegt in **Root** (Expo SDK 56, React Native, Expo Router, TypeScript, Zustand/AsyncStorage), u. a. `src/app/`, `src/components/`, `src/lib/`, `src/content/`.
- [x] WordPecker liegt als **Quellcode** unter `integrations/wordpecker/`.
- [x] Mural liegt als **Quellcode** unter `integrations/mural/`.
- [x] Lokaler Kursfortschritt nutzt `src/lib/store.ts` und `progress-v2`.
- [x] In `app.json` stehen noch fremde Lingo-, Paket- und Expo-Identitäten; `eas.json` enthält noch eine fremde Store-App-ID.
- [x] Root-`README.md` beschreibt teilweise ein früheres `mobile/`-Layout. Tatsächlicher Source-Einstieg liegt jetzt in der Wurzel.
- [x] Root-`LICENSE` nennt Expo/650 Industries; Rechtekette des übernommenen Hauptcodes und der Content-/Audio-Assets ist noch zu belegen. WordPecker/Mural besitzen jeweils eigene Lizenzdateien.
- [x] Im Root-Tree sind derzeit **keine** eigenen GitHub-Actions-Workflows und **keine** separat abgelegten Root-Testdateien erkennbar.
- [ ] TypeScript, Build, Web, iOS-Simulator, Android-Emulator, IPA/APK, Geräteprüfung und realer KI-Dialog **NICHT GETESTET** in diesem Arbeitsgang.
- [ ] WordPecker und Mural funktional integriert: **NEIN**.

## Abfolge mit klaren Stop-/Weiter-Kriterien

### M0 — Baseline, Sicherheit und rechtliche Bestandsaufnahme [P0]

**Aufgaben:**
- Verzeichnis-/Startpfade, Lockfile, Node/Bun/Expo-Version, Import-Quellen und upstream-Commitstände dokumentieren.
- Rechtliche Herkunft prüfen: **Lingo-Lessons-Code, Kurs-Packs, Bilder, Audio, Wortlisten, Mural-/WordPecker-Assets**. Lizenz-/Copyright-Hinweise niemals stillschweigend ersetzen.
- Öffentliches Repository auf im Git-Verlauf gelandete Secrets, persönliche Daten, fremde Apple-/EAS-/Zahlungskonfiguration und unzulässige Inhalte prüfen. Fund nur über geschützte Meldung bearbeiten; keine Werte im Bericht ausgeben.
- Baseline: Installation, `bunx tsc --noEmit`, `bunx expo start --web` und Kernabläufe tatsächlich ausführen, Fehler reproduzieren. Falls Bun nicht funktioniert, exakte Toolchain-Blocker festhalten.

**Fertig wenn:** Befunde und Befehle mit Ergebnissen dokumentiert; keine ungeklärte kritische Leckage für weitere öffentliche Arbeit. Fehlende Lizenzrechte bleiben explizit **Release-Blocker**.

### M1 — Haupt-App lauffähig und Regressionstests [P0]

**Aufgaben:**
- Root-`README.md` und lokale Startanleitung auf tatsächliche Root-Struktur korrigieren (keine falschen `cd mobile`-Befehle).
- Typecheck, Lint, Inhalts-Konsistenzprüfung und kleine automatisierte Tests (Kursliste, Lektions-ID, XP, SRS, Kurswechsel, Neustart/Migration) erstellen.
- Eigene CI auf PRs mit minimalen Prüfungen; keine Signierung, API-Kosten oder Store-Veröffentlichung in CI.
- Aktuelle Lernpfade, Offline-Audio und Lernfortschritt nicht ändern, ohne Regression.

**Fertig wenn:** Abhängigkeiten reproduzierbar, Typecheck und neue CI auf dem Ziel-Branch grün; ein Web-/mobiler Lernpfad praktisch geprüft (Plattform genau nennen).

### M2 — Eigene RED-POLY-Identität und Sicherung [P0]

**Aufgaben:**
- Eigenes Icon, Anzeigename, URL-Scheme, iOS-Bundle-ID und Android-Package definieren; vorhandene fremde `app.json`-/`eas.json`-Identitäten vollständig ersetzen **nach** Prüfung von Update- und Store-Folgen.
- `progress-v2` beibehalten; Export/Import eines versionierten lokalen Backups entwickeln und Roundtrip mit Testdaten prüfen.
- Sprachwahl und Einstellungen updatefest halten; bei Migrationsfehlern alte Daten unangetastet lassen.

**Fertig wenn:** Keine fremden Release-IDs, Backup/Restore getestet, Daten bleiben nach Neustart/Update erhalten. Noch keine Veröffentlichung.

### M3 — Gemeinsamer Lernkern [P1]

**Aufgaben:**
- Typisierte Modelle für `Course`, `Word`, `Lesson`, `ReviewEvent`, `ConversationSession` entwerfen (Beispiele; keine Behauptung vorhandener APIs).
- Bestehende Kurs-IDs, Wortstatistik und SRS als Quelle der Wahrheit verwenden; Adapter statt eines zweiten parallelen Fortschritts-Stores.
- Dokumentierte Migration für neue Felder, Duplikatsregeln und Mehrsprachigkeit; Tests für zwei Kurse und gemischte Importquellen.

**Fertig wenn:** Bestehende Lektionen und neue lokale Wortlisten den gemeinsamen Fortschritt ohne Verlust nutzen; Migration/Restore wiederholbar.

### M4 — WordPecker: Vokabeln zuerst [P1]

**In dieser Reihenfolge:** eigene Wortliste anlegen → Wörter importieren/exportieren → in bestehenden Übungen lernen → gemeinsame SRS-Fälligkeit → Bilder/KI-Vokabelvorschläge nur optional.

**Technik:** Geeignete fachliche Logik aus `integrations/wordpecker/` analysieren und nach React Native übertragen; **nicht** das komplette React-Frontend plus MongoDB-Backend parallel als zweite App starten.

**Fertig wenn:** Eine eigene Wortliste offline angelegt und in derselben RED-POLY-Navigation gelernt wird; Lernerfolge bleiben nach Neustart erhalten.

### M5 — Mural: Gesprächsmodus [P1/P2]

**In dieser Reihenfolge:** textbasierte Konversation (Provider-Adapter) → Sprachaufnahme/Transkription → Sprachausgabe → individuelle Korrektur → überprüfbarer Rückfluss geeigneter Wörter in SRS.

**Sicherheit:** Klarer Einwilligungsdialog, Netz-/Kostenanzeige, sichere Provider-Credentials, Stop/Timeout/Fallback, keine stillschweigende Übertragung. Kein automatisches Übernehmen der Mural-Zahlung, des Account-Dienstes oder der nativen SwiftUI-/Compose-Oberflächen.

**Fertig wenn:** Ein echter Testdialog mit kontrolliertem Provider funktioniert, Abbruch/Offline-Ausfall getestet ist und ohne KI alle Kernlektionen weiter nutzbar sind. API-Kosten nur nach Nutzerfreigabe.

### M6 — Sprachkurse und Lernqualität [P2]

**Aufgaben:** Kurs-/Inhalts-Pipeline rekonstruieren oder dokumentiert neu aufbauen (der Upstream-Compiler fehlt in der kopierten Root-Struktur). UI-Sprache, Ausgangssprache und Lernsprache trennen. Deutsche, englische, französische und andere Kurse prüfen; Kurmancî und Sorani **getrennt**, mit rechtlich geprüften Quellen und echter Sprachkorrektur integrieren. Lernniveaus und Übungsbewertungen nicht frei erfinden.

**Fertig wenn:** Neue Kurse ohne Code-Duplikate ladbar, Inhalt/Lizenz nachgewiesen und Unterrichtsdaten konsistent testbar sind.

### M7 — RED-Morph-Oberfläche [P2]

**Aufgaben:** Designsystem und Komponenten in der Expo-App vereinheitlichen: ruhiges Optical Glass, systemeigene Navigation, echte Touch-Interaktionen, adaptive helle/dunkle Darstellung, Safe Areas, Screenreader, grosse Schrift, Reduce Motion. Keine generischen Neon-Effekte, kein zusätzliches konkurrierendes Dock.

**Fertig wenn:** Kern-Nutzerwege auf kleinen/grossen Displays und mit reduzierter Bewegung geprüft; keine Lern-/Datenregression.

### M8 — Plattform- und Releaseabnahme [P2/P3]

- iPhone: Simulator → Hardware → passende Signierung → Update-Test unter eigener Bundle-ID.
- Android: Emulator → Hardware → Berechtigungen, Offline, Audio und App-Lifecycle.
- Web: mobil und Desktop im Browser; Storage/Audio/Web-Besonderheiten testen.
- Windows/macOS: **erst danach** Desktop-Shell-Evaluation, Ziel ist Gleichheit der Kernfunktionen und Daten, nicht blind behauptete native Parität.
- Releases erst mit dokumentiertem Commit, Version, Testmatrix, korrekten Signaturen und Rechteprüfung freigeben.

**Fertig wenn:** Je Plattform echte Nachweise vorliegen; „Build erstellt“ und „auf Gerät installiert und geprüft“ nicht verwechseln.

## Agentenorganisation und PR-Strategie

- **Ein Integrationsziel / eine PR zur gleichen Zeit**: erst M0+M1, dann M2+M3, danach WordPecker und Mural nacheinander. Nicht drei widersprüchliche PRs parallel offen lassen.
- Mehrere Chats dürfen unabhängig analysieren und Tests/Entwürfe vorbereiten, aber **eine verantwortliche Integrationsinstanz** führt Änderungen aus und prüft Konflikte. Für gleichzeitige Bearbeitung: je Agent eigenen Branch, klare Dateibereiche, kein Überschreiben.
- Agent **Kern**: `src/lib/`, Datenmodelle, Migration/SRS. Agent **Lernen**: `src/components/exercises/`, Kurse, Wortlisten. Agent **Gespräch**: Analyse und sichere Provider-/Speech-Adapter. Agent **QA/Design**: CI, Geräteprüfungen, RED-Morph-Komponenten. Integrationsagent koordiniert.
- Jede Aufgabe meldet: **Geändert | Getestet (Befehl, Ergebnis, Gerät) | Risiken | Nächster konkreter Schritt**.
- Automatische GitHub Actions können Prüfungen starten; sie integrieren nicht selbstständig beliebige Features. Autonome Dauerarbeit benötigt eine tatsächlich eingerichtete, autorisierte Ausführungsumgebung mit Grenzen.

## Was ich als Nächstes machen würde

**Unmittelbar M0 beginnen, ohne die App-Oberfläche zu verändern:**

1. Lizenzen und Importherkunft inventarisieren; fremde Store-/EAS-Identität als Release-Blocker markieren.
2. Root-Startpfad und Abhängigkeiten reproduzieren, `tsc` starten; Fehlerlog mit Commit erfassen.
3. Danach genau **eine** kleine Baseline-/CI-PR planen; keine WordPecker-/Mural-UI-Portierung vor grünem Grundbuild.

**Status dieser Datei:** Planung erstellt. Keine Builds, CI-Runs, echten Geräte- oder API-Tests wurden durch das Schreiben dieses Plans ausgeführt.
