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

## Deploy the web app to Cloudflare Workers

RED POLY is an Expo Router app. Cloudflare serves only its **web export**, not
native iOS/Android packages. The Worker entry point is `worker/index.js`,
and `wrangler.jsonc` publishes the exported `dist/` as static assets.
Expo's `web.output: "single"` makes deep links such as `/lesson/123`
work via the SPA fallback.

### Deploy from a local checkout

```bash
bun install --frozen-lockfile
npx wrangler@4 login
bun run deploy:cloudflare
```

The command exports the web app into `dist/` and deploys the Worker named
`red-poly`. The live address is printed by Wrangler after a successful
deployment. Run `bun run preview:cloudflare` for a local Workers preview.

### Deploy automatically from GitHub (Workers Builds)

In the Cloudflare dashboard open **Workers & Pages → Create application →
GitHub**, select `Redurbabat/RED-Poly` and connect the `main` branch
**after merging the deployment PR**. Configure:

- **Worker name:** `red-poly` (must match `wrangler.jsonc`)
- **Root directory:** repository root
- **Build command:** `bun run build:web`
- **Deploy command:** `npx wrangler@4 deploy`

The existing `bun.lock` is used for dependency installation. If your build
environment does not install dependencies automatically, configure the build
command as `bun install --frozen-lockfile && bun run build:web`.

Test `/api/health` to confirm the Worker is reachable. Unknown `/api/*`
paths return HTTP 404.

**Data note:** Cloudflare Workers static hosting does not sync or store
language-learning progress across devices. RED POLY currently stores
progress locally. Cloud synchronization would need a separate authenticated
backend and a database (for example Cloudflare D1), with explicit consent
and access control. Never commit credentials or secrets.
