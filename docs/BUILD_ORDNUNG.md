# RED POLY – geordnete Projekt- und Build-Struktur

Diese Struktur ist an RED ION angelehnt, aber auf die vorhandene Expo/React-Native-App abgestimmt. **Expo-Routen und oeffentliche Modulimporte bleiben erhalten.** Die Vokabel-Implementierung ist in Daten, Uebungen und Auswertung aufgeteilt. Gespraeche sind entsprechend in Domain, Daten und Spracherkennung aufgeteilt. Die bisherigen Importdateien bleiben als kompatible Weiterleitungen bestehen, damit bestehende UI-Routen nicht brechen.

## 1. Quellcode (GitHub: bleibt erhalten)

    RED-Poly/
    ├── src/
    │   ├── app/                     Expo-Router-Seiten und Navigation
    │   │   ├── (tabs)/              Lernen, Ueben, Profil
    │   │   ├── lesson/              Lektionen
    │   │   ├── conversation.tsx     Sprachgespraeche
    │   │   ├── vocabulary.tsx       Vokabellisten
    │   │   └── backup.tsx           Sicherung und Wiederherstellung
    │   ├── features/                Fachbereiche (analog RED ION bereiche/)
    │   │   ├── progress/             Kursfortschritt und Migration
    │   │   │   ├── domain/
    │   │   │   ├── data/
    │   │   │   └── transfer/
    │   │   ├── conversation/        Gespraechs-Engine und Spracherkennung
    │   │   │   ├── domain/        Offline-Engine, Sprachen, Niveaus, Tutor-Demo
    │   │   │   │   └── engine.ts
    │   │   │   ├── data/          Lokale Konversationsspeicherung
    │   │   │   │   └── storage.ts
    │   │   │   ├── speech/        Browser- und Systemdiktat nach Zustimmung
    │   │   │   │   ├── web-speech.ts
    │   │   │   │   └── native-speech.ts
    │   │   │   └── *.ts           Kompatibilitaets-Exports fuer alte Pfade
    │   │   └── vocabulary/          Wortlisten und Uebungen
    │   │       ├── data/           Datenzugriff, Versionierung, Transfer
    │   │       │   ├── storage.ts
    │   │       │   └── transfer.ts
    │   │       ├── exercises/      Quiz, Schreiben und Wortbank
    │   │       │   ├── multiple-choice.ts
    │   │       │   ├── word-bank.ts
    │   │       │   └── writing.ts
    │   │       ├── analytics/
    │   │       │   └── statistics.ts
    │   │       └── *.ts            Kompatibilitaets-Exports fuer alte Pfade
    │   ├── lib/                     Gemeinsamer Kern (analog RED ION kern/ und core/)
    │   │   ├── store.ts             Lernfortschritt
    │   │   ├── srs.ts               Wiederholungsalgorithmus
    │   │   └── progress-*.mjs       Stabile API-Weiterleitungen und Typvertraege
    │   ├── components/              UI-Schale, Navigation und Uebungselemente
    │   └── content/                 Gebuendelte Sprachkurse
    ├── worker/                       Cloudflare Worker, keine Nutzer-Synchronisation
    ├── scripts/                      Build-, Diagnose- und Wartungsskripte
    ├── tests/                        Unit-, Integrations- und Browser-Tests
    ├── docs/                         Architektur und technische Dokumentation
    ├── integrations/                 Fremdprojekte als Integrationsreferenz
    ├── wrangler.jsonc                Cloudflare-Konfiguration
    └── package.json                  Zentrale Befehle

## Backup-Bereich (seit 22.11.2026)

```text
src/features/backup/
├── domain/
│   └── complete-device-backup.mjs  Reiner Archivparser, Schemapruefung und stabiler Export
├── data/
│   └── device-export.ts            AsyncStorage-/Lernstand-Leseadapter
├── ui/
│   └── complete-backup-export.tsx  Exportoberflaeche fuer iOS, Android und Web
└── device-export.ts                Kompatible Weiterleitung
```

Die Datei `src/lib/complete-device-backup.mjs` ist eine kompatible Weiterleitung; die zugehoerige `.d.mts`-Typdeklaration bleibt unveraendert. Genauso verweist `src/components/complete-backup-export.tsx` weiter auf das bestehende React-Element. Der Route `src/app/backup.tsx` und den persistierten Lernstaenden wird dadurch nichts weggenommen.

**Wichtig:** Ein vollstaendiges Geraetearchiv kann gelesen und exportiert, aber weiterhin **nicht automatisch zurueckgespielt** werden. Der getrennte Kursfortschritt-Restore unterliegt weiterhin seiner ausdruecklichen Bestaetigung und seinen eigenen Schutzpruefungen. Keine Cloud-Synchronisierung und keine Netzwerkuebertragung.

Tests: `bun run test:backup:architecture` und `bun run test:integration`.

## Lernfortschritt als separater Fachbereich (22.11.2026)

```text
src/features/progress/
├── domain/
│   └── progress-data.mjs          Fortschrittsdaten, Validierung und Migration
├── data/
│   ├── progress-storage.mjs       Serialisierte Speicherung
│   └── progress-write-guard.mjs   Schreibschutz und Ablaufkoordination
└── transfer/
    └── progress-transfer.mjs      Geprüfter Kursfortschritt-Import und -Export
```

Die bisherige `src/lib/progress-*.mjs`-API wird weiterhin unveraendert exportiert. Die vier `src/lib/progress-*.d.mts`-Typvertraege und der bestehende `src/lib/store.ts` bleiben erhalten; keine Migration, kein neuer Persistenzschluessel und keine automatische Verbindung mit einer Cloud. Die Uebungs-SRS-Funktion `src/lib/srs.ts` bleibt als gemeinsame, plattformuebergreifende Logik an ihrem bisherigen Ort. Der bestehende Import von WordPecker-Daten erhaelt die Schreibbarrieren.

`bun run test:progress:architecture` prueft neben den bestehenden Daten-Regressionen die Runtime-Kompatibilitaet, Speicherkennungen und Schutzmechanismen.

## 2. Generierte Ausgaben (build/ – automatisch, nicht in Git)

    build/
    ├── visual-web-emission/          1:1 Kopie des Expo-Web-Exports aus dist/
    │   ├── index.html
    │   └── _expo/...
    ├── visual-web-merged/            Eigenstaendiges Worker-Paket
    │   ├── assets/                  Statische Web-App
    │   ├── worker/
    │   │   └── index.ts             Worker-Einstieg
    │   └── wrangler.jsonc           Staging-Konfiguration (Assets: ./assets)
    ├── cloudflare/
    │   ├── preview/                 Reserviert fuer Vorschau-Artefakte
    │   └── deployments/             Reserviert fuer Deployment-Nachweise
    ├── mobile/
    │   ├── ios/
    │   │   ├── js-bundle/           Reserviert fuer JS-Export
    │   │   ├── simulator/           Reserviert fuer Simulator-Builds
    │   │   └── ipa/                 Reserviert fuer signierte IPA
    │   └── android/
    │       ├── js-bundle/
    │       └── apk/
    ├── desktop/
    │   ├── windows/                 Reserviert; keine Electron-App vorhanden
    │   └── macos/                   Reserviert
    ├── qa/
    │   ├── browser/                 Reserviert fuer Browserpruefung
    │   └── reports/                 Reserviert fuer Testergebnisse
    └── metadata/
        └── build-layout.json       Manifest: Pfade und Erstellungsstatus

Die Unterordner fuer Windows, macOS, IPA und APK werden nur als **Ablageorte** angelegt. Das ist kein Nachweis fuer native Builds. Anders als RED ION nutzt RED POLY derzeit Expo und hat noch keine Electron- oder Windows-Installer-Pipeline.

## 3. Befehle

    bun run build:structure           Nur Ordner und Manifest erstellen
    bun run build:web:organized       Web-App exportieren und in zwei Ausgabeordner einsortieren
    bun run test:build-structure      Layout- und Sicherheitspruefungen lokal ausfuehren

Der normale Befehl bun run build:web bleibt unveraendert. Ebenso bleibt der Cloudflare-Produktiv-Worker unter worker/index.ts und wrangler.jsonc.

Ein eigenstaendiger, fertig gestagter Cloudflare-Web-Build kann ohne zweite Expo-Kompilierung mit folgender Konfiguration geprueft werden:

    bunx wrangler@4 deploy --config build/visual-web-merged/wrangler.jsonc --dry-run

Das Script entfernt bei erneutem Staging alte Web-Artefakte aus den beiden generierten Verzeichnissen, sodass keine veralteten Bundles zurueckbleiben. Es kopiert keine Symbolic Links in den Worker-Snapshot und veraendert keine Originaldateien. Der gesamte Ordner build/ steht in .gitignore.

## 4. Regeln fuer spaetere Module

- Neue Lernfunktionen unter src/features/<bereich>/ als eigene Einheit mit Datenmodell, Engine, UI-Anbindung und Tests entwickeln. Die Vokabel-Fachlogik ist bereits in data/, exercises/ und analytics/ aufgeteilt.
- Wiederverwendbare Algorithmen und Datenzugriffe in src/lib/ halten.
- Expo-Routen unter src/app/ belassen; keine verschachtelten Quellcode-Kopien in build/.
- Navigation und Komponenten unter src/components/ zentral halten.
- Signierte mobile Builds nur nach realem Signier- und Geraetetest ablegen; niemals private Signierschluessel in Git speichern.
- Cloudflare-Worker-Hosting ist **keine** automatische Cross-Device-Synchronisierung.

## 5. Sprachgespraeche als Module

`src/features/conversation/domain/engine.ts` enthaelt weiterhin nur den Offline-Demotutor; es wurde **kein KI-Anbieter** und kein Kosten- oder API-Schluessel hinterlegt.
`src/features/conversation/data/storage.ts` verwendet weiterhin den lokalen Key `red-poly-conversation-v1` und wartet auf ausstehende Schreibvorgaenge.
`src/features/conversation/speech/` kapselt optionale Web- und native Spracherkennung. Mikrofonzugriff erfolgt nur nach ausdruecklicher Zustimmung.

Alle vier ehemaligen Top-Level-Module (`engine.ts`, `storage.ts`, `web-speech.ts`, `native-speech.ts`) bleiben als `export *`-Weiterleitung erhalten. Expo-Screens, Tests und externe Module nutzen weiter die bisherigen Importpfade.

`bun run test:conversation:architecture` prueft die Laufzeit-Kompatibilitaet, die unveraenderte Speichernorm und die getrennten Sprachadapter.
