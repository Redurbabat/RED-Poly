# RED POLY – geordnete Projekt- und Build-Struktur

Diese Struktur ist an RED ION angelehnt, aber auf die vorhandene Expo/React-Native-App abgestimmt. **Expo-Routen und oeffentliche Modulimporte bleiben erhalten.** Die Vokabel-Implementierung ist innerhalb ihres Features in Daten, Uebungen und Auswertung aufgeteilt. Die bisherigen Importdateien bleiben als kompatible Weiterleitungen bestehen, damit bestehende UI-Routen nicht brechen.

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
    │   │   ├── conversation/        Gespraechs-Engine und Spracherkennung
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
    │   │   └── progress-*.mjs       Backup, Migration und Schreibschutz
    │   ├── components/              UI-Schale, Navigation und Uebungselemente
    │   └── content/                 Gebuendelte Sprachkurse
    ├── worker/                       Cloudflare Worker, keine Nutzer-Synchronisation
    ├── scripts/                      Build-, Diagnose- und Wartungsskripte
    ├── tests/                        Unit-, Integrations- und Browser-Tests
    ├── docs/                         Architektur und technische Dokumentation
    ├── integrations/                 Fremdprojekte als Integrationsreferenz
    ├── wrangler.jsonc                Cloudflare-Konfiguration
    └── package.json                  Zentrale Befehle

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
