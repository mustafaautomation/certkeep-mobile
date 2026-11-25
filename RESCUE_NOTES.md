# Rescued from Cursor

Source: Certkeep Mobile — Expo app | Cursor https://cursor.com/agents/bc-933c507a-e416-5449-92d4-e4687a890eae
Scope: Last Agent Turn
Captured: 2026-11-25T11:52:38.425Z
Files written: 65

Not in this copy: files Cursor's template created and the agent never changed (e.g. tsconfig, shadcn ui components, lockfiles, public assets) when scope is 'Last Agent Turn'; binaries.


## Repair pass (Claude, 2026-11-25)

Recreated:
- assets/{icon,favicon,splash-icon,android-icon-foreground,android-icon-background,android-icon-monochrome}.png: copied from expo-template-blank-typescript@58.0.35 (stock Expo placeholder icons, not Certkeep branding).
- package-lock.json: regenerated with npm.
- docs/screenshots/*.png: re-captured from the rebuilt web export with scripts/capture-screenshots.mjs (real captures).
- .gitignore: added .env.* (keeping !.env.example).

Fixed:
- e2e/smoke.spec.ts: getByText('Harrow Hauling') matched both the hidden vault row (still mounted under the stack on web) and the requirement screen; now filters to the visible one.

Checks run locally on 2026-11-25 (Node 22.23.4, the CI version; npm install was done with Node 25):
- npm install: OK, package-lock.json regenerated (all from registry.npmjs.org)
- npm run lint: pass
- npm run typecheck (tsc --noEmit): pass
- jest: 3 suites, 14 tests pass (matches the Cursor run)
- npx expo export --platform web: pass (dist/)
- Playwright web e2e (chromium, CI=true): 2 passed (matches the Cursor run)

Note: under heavy machine load the first cold Jest run timed out on the first component test of a few suites (default 5s timeout while modules transform); a warm re-run passes. Not a code problem, but CI on a cold cache could be slow on that first test.

Still missing / needs a person: real app icons; Maestro flows not run; Apple/Google/Expo accounts, Supabase project, APNs/FCM, DNS. No EAS build was run.
