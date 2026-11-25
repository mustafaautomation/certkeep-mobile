# Certkeep mobile

## Build

```bash
npm ci
npx expo export --platform web
```

Dev web server: `npm run web` (port 43123).

## Env vars

All optional. Leave unset for the seeded demo vault.

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_AUTH_REDIRECT_URL` (optional magic-link return URL)
- `EAS_PROJECT_ID` (optional, only for a cloud build)

Never set a Supabase service-role key in the app.

## Live URL target

https://certkeep-app.quvantic.com

Local preview while this agent is running: http://127.0.0.1:43123

## Tests

```bash
npm run lint
npm run typecheck
npm test
npm run export:web
npm run test:e2e
```

Maestro (device or simulator, not CI): `maestro test .maestro`

CI: `.github/workflows/ci.yml` on ubuntu-latest, no secrets. Playwright is `@playwright/test` >= 1.65.1.
