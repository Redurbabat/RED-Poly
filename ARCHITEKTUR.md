# RED POLY — ARCHITEKTUR.md

**Stand:** 14.11.2026  
**Status:** Istaufnahme aus dem GitHub-Repository `Redurbabat/RED-Poly` plus **explizit gekennzeichnete Zielarchitektur**. Eine technische Zusammenführung der drei Anwendungen ist noch nicht belegt.

## 1. Produktziel und Architekturentscheidung

RED POLY ist **eine** mehrsprachige Lern-App mit Kursen, Lektionen, Wortlisten, Wiederholung und später optionalen KI-Gesprächen.

- **Haupt-App:** der bereits in die Repository-Wurzel kopierte Lingo-Lessons-Mobilcode (Expo SDK 56, React Native, Expo Router, TypeScript).
- **Integrationsquelle 1:** WordPecker (React-Frontend + Node-/Backend) unter `integrations/wordpecker/`.
- **Integrationsquelle 2:** Mural (SwiftUI-iOS, Jetpack-Compose-Android und API-Service) unter `integrations/mural/`.
- **Marke und Zielprodukt:** RED POLY. Übernahme der Funktionalität bedeutet **keine** Übernahme fremder Produktidentität, Konten, Bezahlstrecken oder Store-Zuordnung.
- **Harte Grenze:** Offline-Lernen, bestehende Daten und vorhandene Routen dürfen nicht für eine neue Integration geopfert werden.

## 2. Tatsächlich vorhandene Struktur

```text
RED-Poly/
├── README.md                    # noch upstream-orientierte Beschreibung
├── LICENSE                      # Expo-MIT-Text; Lingo-Herkunft prüfen!
├── package.json                 # Expo SDK 56, RN, React, TypeScript, Zustand
├── bun.lock
├── app.json                     # noch alte Lingo-/Expo-/Paketidentität
├── eas.json                     # noch fremde App-Store-Zuordnung
├── src/
│   ├── app/                     # Expo Router: Einstieg und Navigation
│   │   ├── _layout.tsx
│   │   ├── (tabs)/              # Lernen, Üben, Profil
│   │   ├── onboarding.tsx
│   │   ├── courses.tsx
│   │   ├── lesson/[id].tsx
│   │   └── guidebook/[unitId].tsx
│   ├── components/
│   │   └── exercises/           # Antwort-, Wortbank-, Matching-Übungen
│   ├── lib/
│   │   ├── store.ts             # Zustand + AsyncStorage: progress-v2
│   │   ├── srs.ts               # Wiederholungslogik
│   │   ├── content.ts           # Kurs-Pack-Auflösung und Caching
│   │   ├── audio.ts             # Audio-Helfer
│   │   ├── navigation.ts
│   │   ├── theme.ts
│   │   └── types.ts
│   └── content/
│       ├── catalog.json
│       ├── pack.json
│       ├── audio-manifest.ts
│       └── packs/               # vorhandene Sprachpaare, z.B. de-en, es-en
├── assets/audio/                # gebündelte Kurs-Audiodateien
├── scripts/reset-project.js
└── integrations/
    ├── wordpecker/
    │   ├── LICENSE
    │   ├── frontend/            # eigenständige React-Oberfläche
    │   └── backend/             # eigenständige API/DB/Agenten
    └── mural/
        ├── LICENSE
        ├── apps/ios/            # SwiftUI
        ├── apps/android/        # Jetpack Compose
        ├── services/api/        # eigener API-Dienst
        └── shared/              # Mural-spezifische Verträge/Fixtures
```

**Wichtig:** In `README.md` stehen noch Anweisungen mit `mobile/` und einem Content-Compiler unter `../content/`. Im hier hochgeladenen Repository liegt die Expo-App aber direkt in der Wurzel; es gibt in `scripts/` derzeit nur `reset-project.js`. Den Content-Autorenprozess daher **nicht als vorhanden behaupten**. Vor weiteren Kursimports reproduzierbare Herkunft und Generierung prüfen.

## 3. Bestehender Daten- und UI-Fluss [Istzustand]

```text
Expo Router  (src/app/)
    │
    ▼
Screens und Übungen  (src/components/, src/components/exercises/)
    │                  │
    │                  ├──► Inhalte: src/lib/content.ts
    │                  │                 │
    │                  │                 └──► src/content/packs/*.json
    │                  │                          + assets/audio/
    │                  │
    └──────────────────┴──► Fortschritt: src/lib/store.ts
                                        │
                                        ├──► SRS: src/lib/srs.ts
                                        └──► AsyncStorage: progress-v2
```

- `src/app/_layout.tsx` reagiert auf die gespeicherte Onboarding-Entscheidung und den Hydration-Status. Keine neuen Redirects, die den bestehenden Onboarding-/Fortschrittsfluss umgehen.
- `src/lib/content.ts` lädt die gebündelten Kurs-Packs und baut Kursindizes auf. Quelle ist `src/content/packs/index.ts`.
- `src/lib/store.ts` speichert den Fortschritt je Kurs, darunter XP, abgeschlossene Lektionen, Fehler, Wortstatistik und SRS. Die Migration früherer Zustände ist Bestandteil des Bestandscodes.
- Die Repository-Wurzel enthält bereits ein Paket zum Entwickeln der mobilen App; **keine** unabhängige WordPecker- oder Mural-Laufzeit wird hierdurch automatisch gestartet.

## 4. Zielarchitektur [geplant, noch nicht implementiert]

Neue Verzeichnisse sind Vorschläge und dürfen erst nach Quellprüfung angelegt werden. Sie gehören zu **einer** Expo-App:

```text
src/
├── app/                           bestehende Expo-Routen
├── components/                    wiederverwendbare RED-POLY-Oberfläche
├── features/                      [GEPLANT]
│   ├── courses/                   bestehende Kurse über Adapter
│   ├── vocabulary/                WordPecker-Funktionen nach Portierung
│   ├── practice/                  bestehende SRS-/Übungslogik
│   └── conversation/              Mural-Ideen/Logik nach Portierung
├── domain/                        [GEPLANT] sprach- und UI-unabhängige Modelle
│   └── learning/                  Course, Lesson, Word, ReviewEvent
├── services/                      [GEPLANT]
│   ├── content/                   Inhaltspakete, Herkunft, Sprache
│   ├── speech/                    Audio, Mikrofon, Berechtigungen
│   └── ai/                        optionale Provider-Adapter
└── data/                          [GEPLANT]
    ├── local/                     versionierte lokale Speicherung
    ├── migrations/                nachvollziehbare Migrationen
    └── backup/                    Export/Import mit Roundtrip
```

**Abhängigkeitsrichtung:** `app/screens → features → domain + services/data`. Der Lernkern darf nicht von einzelnen Screens, Expo Router oder einem KI-Anbieter abhängen. Jede Feature-Grenze besitzt eine kleine typisierte Schnittstelle. Bestehende `src/lib/`-Dateien **nicht vorschnell verschieben** – zuerst mit Tests absichern.

**Einziger Lernzustand:** Neue Module lesen/schreiben über klar definierte Domänenaktionen, nicht über mehrere konkurrierende globale Stores. Separater technischer Cache ist erlaubt, wenn er keine zweite Wahrheit über Nutzerfortschritt wird.

## 5. Integration statt Kopieren ganzer Laufzeiten

### Phase A — Haupt-App stabilisieren

1. Abhängigkeiten und Startpfade anhand der **Root-`package.json`** prüfen; Expo ist in der Wurzel, nicht unter `mobile/`.
2. Herkunft und Lizenz des Lingo-Lessons-Codes sowie der Kurs-Packs/Assets klären.
3. Kurswahl, Onboarding, Lektion, Wiederholung, Offline-Neustart und gespeicherten Fortschritt als Regression festhalten.
4. Eigene App-/EAS-Identität in separater Aufgabe konfigurieren, ohne eine bestehende Nutzerinstallation versehentlich zu überschreiben.

### Phase B — WordPecker-Vokabeln

- Funktion und Abhängigkeiten aus `integrations/wordpecker/frontend/` und `backend/` einzeln analysieren.
- Wortlisten, Import, Lernmodi und ggf. Inhaltsgenerierung als **React-Native-kompatible Features** nachbauen/portieren; bereits vorhandene Übungskomponenten wiederverwenden.
- WordPecker-MongoDB, Backend und eigene Logins **nicht** automatisch als Pflichtvoraussetzung übernehmen. Für Offline-Lernen die Daten im gemeinsamen lokalen Lernmodell speichern.
- Geplante Adapter-Schnittstellen etwa `VocabularyRepository`, `VocabularyPracticeService`, `VocabularyImportService`. Das sind **Designnamen**, keine vorhandenen APIs.
- Import alter und neuer Vokabellisten darf keine bestehenden Kursstatistiken löschen. Herkunft und Lizenz importierter Wörter/Bilder separat nachhalten.

### Phase C — Mural-Gespräche

- Mural-SwiftUI-/Kotlin-Views sind **kein** direkt importierbarer React-Native-Komponentensatz. Fachregeln, Sprachmodule, Interaktionsfälle und nutzbare Providerkonzepte prüfen und gezielt portieren.
- Vorgesehene Funktionsgrenze: `ConversationSession` + `SpeechInput`/`SpeechOutput` + `AIProvider` + `LearningEventSink` (nur Zielidee).
- Mikrofonzugriff, Spracheingabe, Streaming, Stummschaltung, Abbruch, Netzwerkfehler und Kostenlimit separat behandeln.
- Gesprächsereignisse können als geprüfte Lernereignisse in den **gleichen** Kursfortschritt einfliessen; keine unkontrollierte KI-Bewertung als offizielle Lektion oder Sprachzertifikat.
- Mural-Zahlung, Stripe, Account-/Cloud-API, Session-Daten oder Telemetrie nicht ungeprüft integrieren.

### Phase D — Sprachen, Design, Plattformen

- Mehrsprachige UI von Lernsprache und Übersetzungssprache trennen; Kursmodelle und Schriftarten für Kurmancî, Sorani, Deutsch, Englisch usw. erst nach Content-Prüfung ergänzen.
- RED-Morph-Richtlinien als Designziel verwenden, aber Expo-/React-Native-Mechanik und Plattformkonventionen beibehalten.
- iPhone/Android/Web zuerst absichern. Windows/macOS später als eigene, nachgewiesene Desktop-Ziele.

## 6. Datenintegrität und Migrationsverträge [hart]

**Bestehender Schlüssel:** `progress-v2` in AsyncStorage. Ein neuer Store darf diesen nicht ohne getesteten Übergang überschreiben.

Für jede Erweiterung:
1. Stabile Kennungen für Kurs, Lektion, Wort, Session und Lernereignis definieren; sie müssen sprach- und quellenübergreifend eindeutig sein.
2. Bestehende Daten zunächst **lesen**, neues Schema in einer Version abbilden, erst nach erfolgreichem Schreiben und Verifizieren umschalten.
3. Wiederholter Import und wiederholte Migration sind idempotent; Duplikate nicht mit Verlust von XP/SRS „bereinigen“.
4. Abbruch, fehlender Speicherplatz, beschädigte Datensätze, App-Neustart, Kurswechsel und alte Version testen.
5. Sicherung/Restore vor größeren Datenmodelländerungen anbieten; **ein Backup ist geplant, nicht als aktuelle RED-POLY-Funktion bestätigt**.
6. Lokale Audio-/Wort-Caches von persönlichen Lernständen unterscheiden; Cache darf löschbar sein, Nutzerfortschritt nicht.

## 7. Sicherheit, Netz und KI

```text
Offline-Kursdaten ──► lokale Lektionen + SRS          [ohne Netzwerk möglich]
                           │
User entscheidet KI zu nutzen
                           ▼
Berechtigung + Info + Kosten-/Providerwahl
                           │
                           ▼
AIProvider / Speech-Adapter                       [GEPLANT]
       │
       ├── sichere Schlüsselablage / optionaler Proxy
       ├── Abbruch, Rate-Limit, Timeout, Fehlerstatus
       └── nur ausdrücklich freigegebene Daten übertragen
```

- Keine automatische Übertragung von Mikrofonaufnahmen, Lernprofilen oder privaten Dateien an einen Provider.
- Keine Secrets in `app.json`, GitHub, JavaScript-Bundles, Screenshots, Logs oder Fixtures.
- Nutzerwissen und Cloud-Antworten nicht als gleich verlässlich markieren.
- Anbieterwechsel und Ausfall dürfen die Offline-App nicht blockieren.
- Für Anbieteraufrufe Kosten, Datenaufbewahrung, Löschung, Altersanforderungen und Vertragslage **vor Aktivierung** prüfen.

## 8. Recht, Quellherkunft und Veröffentlichung

| Quelle | Im Repository | Integrationsstatus / Pflicht |
| --- | --- | --- |
| Lingo-Lessons-Mobilcode | Root-`src/`, `assets/` usw. | Haupt-App übernommen; **Lizenz-/Asset-Kette und Herkunft noch prüfen**. Root-`LICENSE` weist Expo aus. |
| WordPecker | `integrations/wordpecker/` | Quellbestand; MIT-Text vorhanden. Einzelne Assets, Beispiele und Provider gesondert prüfen. |
| Mural | `integrations/mural/` | Quellbestand; MIT-Text vorhanden. Native Ports, API- und Payment-Module separat prüfen. |
| RED-Bit / Redion | **nicht** eingebunden | Nur Regeln gelesen; keine Quelldateien übernehmen oder dort schreiben. |
| RED Morph | **nicht** eingebunden | Designreferenz; technische und lizenzrechtliche Integration separat. |

**Sperre vor Release:** `app.json` enthält derzeit `com.ahmet.lingo`, `ahmet909` und fremde EAS-Metadaten; `eas.json` enthält eine fremde App-Store-ID. **Nicht unter diesen Identitäten bauen, signieren oder veröffentlichen.** Eigene Paketnamen/Store-Verknüpfung erst nach Prüfung der Auswirkungen auf Updates und lokale Daten wählen.

## 9. Build- und Prüfmatrix

Befehle sind **vorgeschlagene Prüfungen** auf Grundlage der gelesenen Root-`package.json`; in dieser Dokumentationsänderung wurde keiner davon ausgeführt.

| Stufe | Befehl / Prüfung | Aussage |
| --- | --- | --- |
| Struktur | `git status --short --branch`, `git diff --check` | Branch und Diff nachvollziehen. |
| Dependencies | `bun install --frozen-lockfile` | Installation gegen vorhandenen `bun.lock`, falls Toolchain passt. |
| TypeScript | `bunx tsc --noEmit` | Typen der Root-App; keine UI-Abnahme. |
| Web-Start | `bunx expo start --web` | Entwicklungsserver; Kernflows manuell prüfen. |
| iOS | Expo/Xcode Simulator + echtes iPhone | Separater Build-, Navigations-, Audio-/Mikrofon- und Daten-Nachweis. |
| Android | Expo/Android Emulator + echtes Gerät | Separate Berechtigungen, Audio, Offline und Rückkehr prüfen. |
| Lernlogik | Kurswechsel, SRS, XP, Lektion, Wortimport, Neustart | Vorher-/Nachher-Daten, Migration und Roundtrip dokumentieren. |
| Datenschutz | Netzwerkzugriffe und Logs bei Offline-/KI-Modus | Kein unerwarteter Upload; keine Secrets. |
| Releases | eigene Identität, Signatur, Paket, Installation, Update | Simulator-Build allein ist keine veröffentlichbare App. |

**Ergebnisstatus:** `QUELLTEXT GELESEN` / `TYPEN GEPRÜFT` / `WEB GETESTET` / `SIMULATOR GETESTET` / `ECHTGERÄT GETESTET` / `SIGNIERT` / `VERÖFFENTLICHT`. Ohne Nachweis: **NICHT GETESTET**.

## 10. Definition von fertig

Ein neues Feature gilt erst als integriert, wenn es in **derselben RED-POLY-Navigation** erreichbar ist, denselben Kurs-/Nutzerzustand respektiert, Offline- und Fehlerverhalten besitzt, Rechte/Privatsphäre dokumentiert sind und die passenden Regressionen tatsächlich bestanden wurden.

**Quellcode kopiert ≠ kompatibel gebaut ≠ integriert ≠ auf Gerät geprüft ≠ ausgeliefert.**

**Weitere Regeln:** [CLAUDE.md](CLAUDE.md) · **Entscheidungen und Blocker:** [ENTSCHEIDUNGEN.md](ENTSCHEIDUNGEN.md).
