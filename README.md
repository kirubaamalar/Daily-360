# Daily360

A private, offline-first personal life manager. Finance, study, habits, wellness, and company work, kept separately and stored only on your device.

No backend, no account, no sync. Data lives in the browser's IndexedDB (via Dexie). It is not encrypted or password protected, so keep regular JSON backups from Settings.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # data-layer tests (fake IndexedDB)
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ to test the PWA and offline mode
```

Requires Node 20 or newer.

## Deploy free on Cloudflare Pages

1. Push this folder to a GitHub repository.
2. In Cloudflare, go to Workers & Pages, create a Pages project and connect the repository.
3. Framework preset: Vite. Build command `npm run build`. Output directory `dist`.
4. Deploy. `wrangler.jsonc` serves `dist` and sends every route to `index.html`, so deep links work.

Netlify works the same way (it also reads `_redirects`). For GitHub Pages, set `base` in `vite.config.ts` to the repository path.

## Install on Android

Open the deployed HTTPS link in Chrome, then menu, then Install app (or Add to Home screen). After the first load the app works fully offline. In Settings, tap Protect storage so Chrome does not evict data when space is low.

See `ARCHITECTURE.md` for structure, data model, and the build-phase roadmap.

## Reminders (notifications)

Water reminders (default every hour, 10 AM to 6 PM) and a bedtime reminder (default 11:30 PM) are sent by the
Worker in `worker/`. A cron trigger runs every 15 minutes and sends Web Push messages. Turn them on in
Settings, then Reminders. Notification buttons: YES logs 250 ml of water, Remind me later snoozes 15 minutes.
While the app is open, the reminder appears as an animated character instead of a system notification.

The server stores only each device's push address, time zone and reminder times, in a Durable Object
that is created automatically on deploy (free plan). Push keys are generated on first use and never
leave Cloudflare, so no secrets need to be configured.

Cloudflare build settings: leave the build command empty and keep the deploy command `npx wrangler deploy`.
`wrangler.jsonc` runs `npm run build` before every deploy.
