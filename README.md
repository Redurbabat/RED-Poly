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
- GitHub Actions: `.github/workflows/cloudflare-workers.yml` prüft auf PRs und `main` den Expo-Web-Build, das Worker-Bundle und die lokalen HTTP-Routen, **ohne zu deployen**.
- Das automatische Deployment übernimmt ausschliesslich die bereits verbundene **Cloudflare Workers Builds** GitHub-Integration. Dafür sind keine `CLOUDFLARE_*`-Secrets im GitHub-Repository nötig; der Cloudflare-Build verwendet den im Dashboard gewählten Build-Token.
- Eine erfolgreiche Veröffentlichung benötigt Zugriff auf das eigene Cloudflare-Konto. Noch keine Cloud-Synchronisation.

### Cloudflare Workers Builds (GitHub-Integration)

Für einen bereits mit GitHub verbundenen Worker unter **Workers & Pages → red-poly → Settings → Builds**:

- **Production branch:** `main`; **Root directory:** Repository-Root (`/`).
- **Build command:** `bun run build:web`.
- **Deploy command (Produktion):** `bunx wrangler@4 deploy`.
- **Preview command:** `bunx wrangler@4 preview` (Cloudflare Workers Previews).
- **Worker-Name** muss `red-poly` entsprechen.
- **Bun:** `bun@1.3.5` ist in `package.json` festgelegt; der Build benötigt `dist/index.html`.

**Ein Deployment-Weg:** Dieses Repository verwendet Cloudflare Workers Builds; GitHub Actions führt nur Validierungen aus. GitHub Actions darf `main` nicht separat automatisch deployen, um konkurrierende Deployments zu verhindern.

**Stand 21.11.2026:** Auf PR #8 ist die lokale GitHub-Actions-Worker-Prüfung für Commit `495b25a` erfolgreich, aber der separate Cloudflare-Workers-Build `a6c42418-fd53-4fce-8e46-225a574d70db` fehlgeschlagen. Ein grüner Dry-Run beweist keine Cloudflare-Veröffentlichung.

**Bei fehlgeschlagenem Cloudflare-Check:** Die GitHub-Actions-Tests allein beweisen kein erfolgreiches Cloudflare-Preview. Den roten `Workers Builds: red-poly`-Check öffnen, im Cloudflare-Dashboard `Deployments → View Build History` den Build auswählen und **die erste relevante Fehlermeldung im Log** prüfen. Besonders Build-/Deploy-Kommando, Root-Verzeichnis, Worker-Name und API-Token verifizieren. Ohne Dashboard-Log lässt sich die Fehlerursache nicht sicher bestimmen.

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
