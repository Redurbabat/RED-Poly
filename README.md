# RED POLY

RED POLY ist eine **lokal nutzbare Sprachlern-App** auf Basis der vorhandenen Lingo-Lessons-Expo-Anwendung. Dieser Integrationsstand vereint Lingo-Lektionen, eine eigene WordPecker-inspirierte Vokabelverwaltung und einen Mural-inspirierten Konversations-**Demomodus** in **einer** App.

> Entwicklungsstatus: **Integrations-PR / kein Release.** Echte KI-Gespräche, Nutzerkonten, Google-Anmeldung und geräteübergreifende Cloud-Synchronisation sind **noch nicht vorhanden**. Es wurde weder eine signierte IPA noch eine APK veröffentlicht.

## Funktionen

- **Lernpfad:** acht gebündelte Sprachkurse mit Übungen, XP, Streaks und Wiederholungen.
- **Meine Vokabeln:** Wortlisten, Offline-Karteikarten, Wortbank-/Schreibübungen, Mehrfachauswahl, lokale JSON-Sicherung. Aktuell separate Vokabelspeicherung `red-poly:vocabulary-v1`.
- **Sprachgespräche:** offline gekennzeichneter Gesprächs-Demomodus. Optionale Web-/native Spracheingabe nur mit Zustimmung, kein Live-KI-Provider.
- **Backup:** Über **Profil → Backup & restore** ist ein ausdrücklich gestarteter, geprüfter Export/Restore des Kursfortschritts verfügbar. Eigene Wortlisten lassen sich weiterhin getrennt in **Meine Vokabeln** sichern.
- **Fortschritt:** bestehender `progress-v2`-Store wird beibehalten. Der Core-Branch bietet eine **explizite** geprüfte Legacy-Vokabel-Importfunktion; automatische Migration ist nicht aktiviert.
- **iOS-Navigation:** Native iPhone-Tabbar mit SF Symbols und systemeigenem iOS-26-Liquid-Glass, Android/Web behalten ihre bisherige Tabbar (Hardwareprüfung ausstehend).
- **Design und QA:** gemeinsame RED-POLY-UI-Primitive und Entwicklungs-Testseiten; das bestehende Hauptdesign wird schrittweise umgestellt.
- **Web:** Cloudflare Worker mit statischen Expo-Assets und `GET /api/health`. Das Hosting ist kein Daten-/Sync-Backend.

## Entwicklerstart

Die Expo-App liegt **im Repository-Root** (nicht in `mobile/`).

```bash
bun install --frozen-lockfile
bunx expo start
```

Im Browser: `bunx expo start --web`.

Typen und Regressionen:

```bash
bunx tsc --noEmit
bun run test:integration
```

Die Tests enthalten Struktur- und Unit-Prüfungen; reale iPhone-/Android-, Sprach-/Browser- und Datenmigrationsprüfungen sind separat erforderlich.

## Web-App auf Cloudflare Workers

```bash
bun run build:web
bunx wrangler@4 login
bunx wrangler@4 deploy
```

- Worker-Konfiguration: `wrangler.jsonc`.
- Backend: `worker/index.ts` (nur Health-Check und Web-Assets).
- GitHub Actions: `.github/workflows/cloudflare-workers.yml` (PR: Build und Dry-Run; Push auf `main`: Deployment).
- **Erforderliche GitHub-Actions-Secrets für automatisches Deployment:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Eine erfolgreiche Veröffentlichung benötigt Zugriff auf das eigene Cloudflare-Konto. Noch keine Cloud-Synchronisation.

## Native Builds / App-Identität

iOS-Bundle-ID und Android-Package: `com.redurbabat.redpoly`; Expo-Scheme: `redpoly`. Die früheren Lingo-/Expo-/App-Store-Kennungen sind in `app.json` und `eas.json` entfernt.

**Achtung:** Änderungen der nativen Bundle-ID erzeugen eine andere Installation. Alte lokale Daten sind dadurch nicht automatisch zugänglich. Vor dem Umstieg Sicherung, Backup-/Restore-Test und Updatepfad überprüfen. Für die native Spracherkennung ist ein neuer Dev-/Native-Build nötig; Expo Go enthält das Modul nicht.

## Dokumentation

- `ARCHITEKTUR.md`, `ENTSCHEIDUNGEN.md`, `UMSETZUNGSPLAN.md`
- `docs/CORE_DATA_API.md` (Daten, Migration und Backup)
- `docs/agent-02-wordpecker.md` (Vokabeln)
- `docs/MURAL_CONVERSATION_INTEGRATION.md` (Konversation, Einwilligung und Kosten)
- `docs/RED-POLY-DESIGN-QA.md`, `docs/RED-POLY-IOS-QA.md`

## Herkunft und Veröffentlichung

Die Haupt-App wurde aus Lingo Lessons übernommen, mit WordPecker- und Mural-Quellen im Verzeichnis `integrations/`. Alle Quellcode-, Inhalts-, Audio- und Bildlizenzen müssen **vor einer öffentlichen Distribution** nachweisbar geprüft werden. Die vorhandene Root-`LICENSE` nennt nur Expo/650 Industries und ist **kein** vollständiger Lizenznachweis für Lerninhalte und Grafiken.

Dieses Repository ist eine Entwicklungsbasis. Kein ungeprüfter Store-Release.
