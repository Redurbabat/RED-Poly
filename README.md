# (Open Source) Lingo Lessons

Free, open-source Duolingo-style language learning for English speakers, by [Open Apps Studio](https://github.com/Open-Apps-Studio). No ads, no paywalls, no accounts. **This Expo React Native app is the product.**

[Download on the App Store](https://apps.apple.com/app/id6781818623)

The Next.js app in the repo root is a cloned reference project — useful for UI inspiration and optional content preview/admin, but not the learner experience we're shipping.

## What it does

- **Learn path** — sections, units, and lesson nodes (locked/unlocked progression)
- **Lesson engine** — exercises with feedback, XP, completion flow (no hearts or energy gates — everything is free)
- **Practice tab** — mistake review and spaced repetition (SRS)
- **Profile** — streak, stats, per-course progress
- **8 courses** — Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese (all for English speakers)

## How it's built

- **Expo SDK 56** + React Native, file-based routing in `app/`
- **Local-first** — progress lives on-device (zustand + AsyncStorage), per course. No accounts or backend in v1.
- **Bundled content packs** — compiled JSON + pre-generated TTS audio, not fetched at runtime

Content is authored in `../content/`, compiled by `../scripts/compile-content.ts`, and bundled into `src/content/packs/`. See `../AGENTS.md` for the full pipeline.

## Get started

From the repo root:

```bash
cd mobile && bun install && bunx expo start
```

Add `--web` to open in a browser. Typecheck:

```bash
cd mobile && bunx tsc --noEmit
```

## Project layout

```
mobile/
  app/              # screens (Expo Router)
  src/
    components/     # UI + exercise types
    content/        # bundled packs (generated — don't edit by hand)
    lib/            # stores, types, audio helpers
  assets/audio/     # pre-generated TTS MP3s (generated — don't edit by hand)
```

## Docs

- `../AGENTS.md` — repo overview, content pipeline, commands
- `../docs/plan.md` — roadmap (M0–M4), legal boundary on Duolingo content

## Cloudflare Workers – RED POLY Web

Die **Web-Version** von RED POLY kann auf Cloudflare Workers bereitgestellt werden.
iOS- und Android-Builds bleiben davon unberührt. Die Lernfortschritte werden
weiterhin lokal im Browser/Geraet gespeichert; dieses Deployment fuegt
**keine Cloud-Synchronisation und keine Nutzerkonten** hinzu.

Konfiguration:
- `wrangler.jsonc` – Worker-Name `red-poly`, statische Dateien aus `dist/`,
  SPA-Fallback fuer direkte Links (z. B. `/lesson/123`).
- `worker/index.ts` – minimales Worker-Script mit `GET /api/health` (Statuscheck)
  und Weitergabe an die statischen Expo-Web-Dateien.
- `.github/workflows/cloudflare-workers.yml` – Web-Build in Pull Requests,
  automatisches Deployment bei Push auf `main` (nur mit eingerichteten Secrets).

### Lokal deployen

```bash
bun install --frozen-lockfile
bun run build:web
bunx wrangler@4 login
bunx wrangler@4 deploy
```

Nach dem ersten erfolgreichen Deployment zeigt Wrangler eine URL wie
`https://red-poly.<dein-workers-subdomain>.workers.dev` an.

### Automatisches Deployment via GitHub Actions

Unter **GitHub → RED-Poly → Settings → Secrets and variables → Actions**
folgende **Repository-Secrets** anlegen:

- `CLOUDFLARE_API_TOKEN`: Cloudflare-API-Token mit Worker-Deploy-Rechten
  fuer dein Konto (z. B. „Edit Cloudflare Workers“ / „Workers Scripts: Edit“).
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID (kein geheimer Schluessel,
  hier aber als Secret hinterlegt).

Nach dem Merge dieses Pull Requests startet die Aktion bei neuen Pushes
auf `main`. Bei Pull Requests erfolgt **nur ein Build/Test**, ohne Cloudflare-
Zugangsdaten. Cloudflare Worker Build und Bereitstellung sind **nicht**
gleichbedeutend mit einem iOS/Android-App-Build.

Falls du die Cloudflare-Dashboard-Git-Integration statt GitHub Actions nutzt:
Build-Befehl `bun run build:web`, Deploy-Befehl `bunx wrangler@4 deploy`.
