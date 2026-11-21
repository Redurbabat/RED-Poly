# RED POLY — ENTSCHEIDUNGEN.md

**Stand:** 14.11.2026  
**Zweck:** Entscheidungen, ihre Herkunft, ihren Status und ihre Folgen nachvollziehbar halten. Keine rückwirkend erfundenen Zustimmungen.

## Leseregel

- **[Bestätigt]**: vom Projekteigentümer im Gespräch vorgegeben.
- **[Bestand]**: im Repository nachvollziehbarer technischer Istzustand; nicht automatisch ein Architekturentscheid.
- **[Projektregel]**: für RED POLY neu festgelegte Arbeitsregel aus dem angeforderten Vergleich mit RED-Bit/Redion. Bei Widerspruch zur Eigentümerentscheidung neu abstimmen.
- **[Offen]**: keine Freigabe oder kein ausreichender Nachweis; nicht als entschieden ausgeben.
- Entscheidungen erhalten stabile Kennungen `E001` usw. Nicht umnummerieren; spätere Änderungen als neue Entscheidung mit Verweis ergänzen.

## Produkt und technische Basis

### E001 — Name und Repository [Bestätigt]
**Entscheid:** Die App heisst **RED POLY** und wird unter `Redurbabat/RED-Poly` entwickelt.  
**Grund:** Einheitliche RED-Markenfamilie (RED ION, RED BIT, RED FIT, RED LOOP, RED MORPH).  
**Folge:** Eigenes Icon, eigener App-Name und eigene Paketidentitäten; bisherige fremde Metadaten nicht als finale Marke behandeln.  
**Quelle:** Eigentümerentscheidung am 14.11.2026.

### E002 — Haupt-App [Bestätigt]
**Entscheid:** **Lingo Lessons** bildet die vorhandene Basis. Bestehende Navigation, Lektionen, XP, SRS und lokaler Lernfortschritt werden erhalten; kein kompletter Neustart.  
**Quelle:** Auswahl des Eigentümers vor dem Import.

### E003 — Zusätzliche Quellen [Bestätigt]
**Entscheid:** **WordPecker** dient als Quelle für Wortlisten, Vokabeltraining und ggf. KI-Inhalte; **Mural** als Quelle für Sprachgespräche, Spracherkennung und adaptive Lernabläufe.  
**Grenze:** Quellcode hochzuladen ist noch keine Funktionsintegration. Nicht die komplette Oberfläche, Cloud-Bezahlstrecken oder Anmeldelogik doppelt starten.

### E004 — Ein Produkt statt drei Apps [Bestätigt]
**Entscheid:** Eine einzige RED-POLY-App mit gemeinsamer Navigation und einem konsistenten Lernfortschritt.  
**Konsequenz:** Eingliederung über fachliche Schnittstellen; keine drei unabhängigen Datenspeicher im Nutzerfluss.

### E005 — Stand des Imports [Bestand]
Am 14.11.2026 enthält `main` eine Expo-/React-Native-App **direkt in der Repository-Wurzel** mit `src/app/`, `src/lib/`, `src/content/`, `assets/audio/` und `package.json`. Zusätzlich existieren `integrations/wordpecker/` und `integrations/mural/` mit jeweils eigenem Quellbaum und einer `LICENSE`.
**Achtung:** Die importierte `README.md` beschreibt teils ein älteres Monorepo mit `mobile/`, obwohl die mobile App aktuell in der Wurzel liegt. Dokumentation und Startbefehle müssen am tatsächlichen Bestand ausgerichtet werden.

### E006 — Plattformstrategie [Projektregel]
**Kurzfristig:** Expo/React Native für **iPhone, Android und Web**, die bereits im verwendeten Stack vorgesehen sind.  
**Später:** Windows und macOS nach technischer Prüfung einer gemeinsamen Desktop-Lösung.  
**Grenze:** Noch keinen nativen Windows-/macOS-Build, keine signierte IPA und kein App-Store-Release behaupten.

## Integrations- und Datenregeln

### E007 — Local-first und Nutzerdaten [Projektregel]
Offline-Lernen mit vorhandenen Kursen bleibt Normalfall; KI ist optional. Lokale Lerndaten erhalten Vorrang vor Cloud-Funktionen. Verluste durch Migration, Gerätewechsel oder geänderte Kurskennungen sind zu verhindern.
**Übernommenes Prinzip:** Redion – Offline und Datenintegrität zuerst; RED-Bit – bestehende Speicher und Migrationen bewahren.

### E008 — Gemeinsames Fortschrittsmodell [Projektregel]
Vorhandener Store: `src/lib/store.ts`, Zustand + AsyncStorage, Schlüssel `progress-v2` mit kursbezogenen Einträgen. Neue Vokabel- und Gesprächsdaten dürfen vorhandene Werte nicht überschreiben.
**Vor Integration erforderlich:** Mapping von Kurs-ID, Lektion-ID, Wort-ID und SRS-Ereignissen; Versionsschema, Datenexport/Import und getestete Migration. Ein neues Schema ist **noch nicht implementiert**.

### E009 — Herkunft, Lizenz und Marken [Projektregel]
Alle Fremdcodequellen, Lizenzen, Copyrights und Content-/Audio-/Asset-Rechte erhalten und nachprüfen. Bei späteren Imports vorher Zustimmung des Eigentümers einholen.
**Bekannter Konflikt:** Root-`LICENSE` enthält ein MIT-Template mit Copyright „650 Industries, Inc. (Expo)“. Damit ist **die Rechtekette für den übernommenen Lingo-Lessons-Code nicht automatisch belegt**. `integrations/wordpecker/LICENSE` und `integrations/mural/LICENSE` sind MIT, aber Kursmaterialien, Audio, Marken und fremde Ressourcen brauchen gesonderte Prüfung.
**Folge:** Vor öffentlicher Verteilung ein Herkunfts-/Lizenzinventar erstellen. Kein vorschneller Lizenztext-Austausch, der Rechteinhaber entfernt.

### E010 — Trennung von KI und Offline-Lernkern [Projektregel]
KI-Service über einen austauschbaren Adapter anbinden; klare Einwilligung vor Audio- oder Textübermittlung; Kostenlimit, Fehler-, Abbruch- und Offline-Pfad. API-Schlüssel nie im Git-Repo oder in normalen Logs; auf Gerät sicher verwahren bzw. über nutzerkontrollierten Proxy.
**Stand:** Mural und WordPecker liegen als Quellcode vor; ein RED-POLY-KI-Adapter ist noch **nicht nachgewiesen**.

### E011 — Parallele Agenten und Pull Requests [Projektregel]
Einem Arbeitsbereich nur einen verantwortlichen Agenten/Branch zuordnen. Pro Integrationsschritt eine koordinierte PR, kleine nachvollziehbare Commits, keine fremden Branches überschreiben, kein direkter Agenten-Push auf `main`, Merge nur nach Eigentümerfreigabe.
**Übernommenes Prinzip:** `RED-Bit/AGENTS.md` und `Redion/AGENTS.md`. Der bereits vom Nutzer hochgeladene initiale Import ist davon nicht rückwirkend betroffen.

### E012 — Design und Barrierefreiheit [Projektregel]
RED-Morph-Richtung: ruhige, eigenständige Optical-Glass-Sprache; UI-Funktion vor Dekoration. Semantischer Kontrast, 44-pt-Treffflächen als Richtwert auf iPhone, Safe Areas, grosse Schrift, Screenreader, reduzierte Animation und Plattform-Fallbacks.
**Übernommenes Prinzip:** RED-Bit `docs/DESIGN_SYSTEM.md`, Redion mobile/Accessibility-Regeln. Spezifische Musikplayer-Docks gelten **nicht** für RED POLY.

### E013 — Tests und Statuswahrheit [Projektregel]
Pro Änderung Nachweise nach Typprüfung, Build, Simulator, echtem Gerät, Migration und Release unterscheiden. **NICHT GETESTET** ist ein valider Status; grüne UI oder existierender Code beweisen keine installierbare oder funktionierende App.
**Übernommenes Prinzip:** Testplan und Agenten-Workflow aus RED-Bit/Redion.

### E014 — Eigene Vertriebsidentität [Projektregel]
Vor EAS-Build, Apple-/Google-Veröffentlichung und Verteilung bisherige fremde Kennungen analysieren und durch **eigene**, konsistent getestete Identitäten ersetzen. Besonders: `app.json` mit `Lingo`, `com.ahmet.lingo`, `owner: ahmet909` und fremder EAS-Projekt-ID; `eas.json` mit fremder `ascAppId`.
**Noch nicht beschlossen:** endgültige iOS-Bundle-ID, Android-Package, Expo-Konto/EAS-Projekt und Store-App-IDs. Nicht eigenmächtig eine fremde Release-Konfiguration verwenden.

### E015 — Sprachen und Quellenqualität [Projektregel]
RED POLY soll mehrere Sprachen unterstützen. UI-Sprache, Ausgangssprache und Lernsprache getrennt speichern. Von Menschen kuratierte Kurse von KI-generierten Vorschlägen sichtbar unterscheiden. Kurmancî und Sorani nicht vermischen.
**Offen:** priorisierte Sprachpaare und Übernahme von RED-KURD-Kursen sind nicht abschliessend festgelegt.

## Offene Entscheidungen / Blocker (nicht stillschweigend auflösen)

| Kennung | Sachverhalt | Vor nächstem Schritt |
| --- | --- | --- |
| O01 | Root-Lingo-Lizenz, mitgelieferte Kurs-Packs, Bilder, TTS-Audio | Herkunft, Rechte und Attributionspflichten datei-/quellbezogen prüfen. |
| O02 | `README.md` verweist auf `mobile/` und Content-Compiler, die in der hochgeladenen Root-Struktur nicht vorliegen | tatsächliches Build-/Content-Verfahren rekonstruieren, fehlende Quellen identifizieren. |
| O03 | Root-App trägt noch fremde App-/EAS-/Store-IDs | Eigenes Namens- und Signierungskonzept inkl. Upgrade-Verhalten festlegen. |
| O04 | Fremde WordPecker-Backend-Dienste / Mural-Zahlungs- und API-Komponenten | nur benötigte, rechtlich und datenschutzseitig geprüfte Funktionen übernehmen. |
| O05 | Konflikte zwischen bestehendem `progress-v2` und Wort-/Gesprächsdatensätzen | versioniertes Modell, Backups, Roundtrip- und Migrationsprüfungen bauen. |
| O06 | Qualität, Abdeckung und Herkunft zusätzlicher Sprachkurse | Sprachen priorisieren, Lerninhalt gegen echte Sprachkenntnisse prüfen. |
| O07 | Kosten und Betreiber der KI-Dienste | BYOK/lokale KI/Proxy vergleichen; keine Verpflichtung zu Abo oder API ohne Einwilligung. |
| O08 | Tatsächliche Geräte-/Web-Builds des neuen kombinierten Repositorys | Typprüfung, Plattformstarts und manuelle Kernabläufe erst durchführen und protokollieren. |

## Änderung einer Entscheidung

Neue Kennung anlegen, betroffene alte Kennung angeben, Begründung, Eigentümerfreigabe (falls nötig), migrations- und release-relevante Folgen dokumentieren. Regeln nicht stillschweigend durch einen Agenten oder eine PR-Beschreibung ersetzen.
