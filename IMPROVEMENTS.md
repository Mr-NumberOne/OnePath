# OnePath – Suggested Improvements

Findings from a project assessment. Items are grouped by priority; tick the boxes as they are done.

Status of checks at assessment time (2026-10-23):
- `next build` (Next 16.2.10, Turbopack): succeeds.
- `tsc --noEmit` (web) and `tsc -p desktop/tsconfig.json --noEmit`: pass, no errors.
- `eslint src desktop`: **59 problems (39 errors, 20 warnings)**. The earlier figure of 14,620 came from linting generated folders (`dist-electron/`, `desktop/dist/`, `.next/`). The real errors are mostly `no-explicit-any`, `@ts-ignore`, and `react-hooks/set-state-in-effect`. See 3.1.
- `npm audit --omit=dev`: **27 vulnerabilities (4 critical, 18 high, 5 moderate)**. See 1.6.
- Tests: none. CI: none.

---

## 0. Critical – data loss (fix before anything else)

- [x] **0.1 Logout clears the shared roadmap file (web only)** – closed, no change needed: the app has a single user, so the shared file is fine. – `src/components/UserButton.tsx` (`confirmLogout`)
  - By design, logout POSTs `[]` to `/api/roadmaps` and the Drive backup is restored on the next login. The logout dialog offers "Backup & Logout" and an explicit "Logout Without Backup". On desktop (one user, one data folder) this works as intended once 0.2 is fixed.
  - Web: there is one shared `custom-roadmap.json`, so one user logging out clears everyone's roadmaps, and one user's restore overwrites everyone's.
  - Fix: only needed if the web build serves more than one user — store roadmaps per user (keyed by `session.user.id`) or keep the wipe desktop-only.

- [x] **0.2 Desktop backup uploads empty progress; restore does nothing** – fixed: all three call sites now use `buildBackupPayload()` / `applyBackup()` in `src/lib/backup.ts`, and logout clears progress via `removeStoredData()`. Theme stays in `localStorage` because `next-themes` owns it. Not yet tested end-to-end in the packaged desktop app. – `src/app/profile/page.tsx`, `src/components/UserButton.tsx`, `src/components/CloudRestorePrompt.tsx`
  - Backup and restore read/write `localStorage` directly (`erp-roadmap-progress-v2`, `theme`, `roadmap-language`).
  - On desktop, progress and settings live in `preferences.json` via `getStoredData`/`setStoredData` (`src/lib/storage.ts`), so backups contain `{}` progress and restores are ignored after reload.
  - "Backup & logout" therefore saves no progress and then wipes the roadmaps (0.1).
  - Fix: route every read/write through `src/lib/storage.ts`; extract one shared `buildBackupPayload()` / `applyBackup()` instead of the three copies.

## 1. Security

- [x] **1.1 Restrict the `desktop` Credentials provider** – fixed: registered only when `DESKTOP_MODE=true` (or in `next dev`, for `npm run dev:desktop`); `authorize` now checks the token with Google's tokeninfo (audience must be the desktop client ID) and takes the user from Google's userinfo instead of the client. Forged sign-ins verified rejected in both modes; real desktop login tested with `npm run dev:desktop`.
  - `authorize` accepts any `accessToken` + `id` without verifying with Google, and the provider is registered in the web build too → anyone can mint a session on a deployed site. Combined with 0.1/1.2, that means anyone can wipe the data.
  - Fix: register it only when `DESKTOP_MODE` is set; better, verify the token against Google's userinfo endpoint inside `authorize`.

- [ ] **1.2 Lock down `/api/roadmaps`** – `src/app/api/roadmaps/route.ts`
  - `GET` has no auth check (the proxy excludes `/api`).
  - `POST` only checks `if (!session)`, so any Google user is effectively an admin and can overwrite the single global file.
  - Body is validated only as "array of ≤ 500 items".
  - Fix: the app is single-user, so per-user storage isn't needed. Allow only the owner's email (e.g. an `OWNER_EMAIL` env var) on both `GET` and `POST`, validate the body with a schema (e.g. zod), cap the payload size in bytes. This matters only if the web build is ever reachable by others; Google sign-in alone lets any Google account in.

- [ ] **1.3 `authSecret` exposed to the renderer** – `desktop/main.ts`, `desktop/storage.ts`, `desktop/preload.ts`
  - The Auth.js signing secret is stored in `preferences.json`, the same store exposed via `store-get`/`store-set`/`store-delete` IPC. Any script in the page can read it (and forge session cookies) or overwrite it.
  - Fix: keep it in a separate file (ideally encrypted with `safeStorage`) and allowlist the keys the IPC handlers accept.

- [ ] **1.4 Remove the Google client secret from the installer** – `scripts/generate-env.js`, `desktop/env.ts`, `desktop/server-manager.ts`
  - `CLIENT_SECRET` is compiled into the distributed app, so it is not secret.
  - Fix: PKCE without a secret (Google "Desktop app" client type) or proxy the token exchange through your own backend. `desktop/auth.ts` already uses PKCE.

- [ ] **1.5 Tighten Electron navigation** – `desktop/main.ts`
  - `will-navigate` allows any http/https origin. Allow only the local origin plus `accounts.google.com` (or keep OAuth in the system browser only).
  - `new URL(url)` is not wrapped in try/catch.

- [ ] **1.6 Fix vulnerable dependencies** (`npm audit --omit=dev`)
  - `next` (critical): upgrade to **16.4.2** or later (also fixes `postcss`, `sharp`).
  - `next-auth` / `@auth/core` (critical): update to the latest beta.
  - `shadcn` (high, pulls in `ts-morph`, `fast-glob`, `micromatch`, `@modelcontextprotocol/sdk`, `hono`, …): it is a CLI; move it to devDependencies, which removes most high findings from the production tree.
  - `xlsx@0.18.5` (high, no npm fix: prototype pollution, ReDoS) parses user-uploaded files. Switch to the SheetJS CDN build or `exceljs`.
  - Then run `npm audit fix` for the remaining transitive issues (`undici`, `proxy-addr`, `qs`, …).

- [ ] **1.7 Handle missing `safeStorage`** – `desktop/auth.ts`
  - When encryption is unavailable the refresh token is dropped with only a `console.warn`, causing confusing repeated logins. Surface an error or fall back deliberately.

## 2. Correctness and reliability

- [ ] **2.1 Server startup race** – `desktop/server-manager.ts`
  - A hard 3 s `setTimeout` also resolves the promise, so the window can load before the server is up; `did-fail-load` in `main.ts` then retries forever. Poll an HTTP health check, reject if the process exits early, cap retries and show an error dialog.
- [ ] **2.2 OAuth loopback server never times out** – `desktop/auth.ts`
  - If the user abandons the browser flow the promise never settles and the server keeps listening. Requests without `code`/`error` (e.g. `/favicon.ico`) are never answered. The `error` value is reflected into HTML unescaped.
- [ ] **2.3 Error masking in `GET`** – any error (incl. corrupt JSON) returns `[]` with 200, and the next save overwrites the file. Only treat `ENOENT` as empty; return 500 otherwise.
- [ ] **2.4 Concurrent writes** – `route.ts` uses one shared `.tmp` file; simultaneous saves can corrupt or lose data. Use a unique temp name per write and/or a write queue.
- [ ] **2.5 Builder saves ignore failures** – `src/app/builder/page.tsx` (import, create, toggle, delete) never checks `res.ok`, so a 401/413/500 still shows a success toast.
- [ ] **2.6 Bilingual data model** – `en` and `ar` hold separate phase lists and the builder adds/edits phases in the current language only. Authors build everything twice, and progress (`completedPhases`, study hours from `phases[language]`) drifts when phase IDs differ between languages. Consider one phase list with `{ en, ar }` text fields.
- [ ] **2.7 Google Drive helper** – `src/lib/gdrive.ts`
  - `checkBackupExists` takes the first match; consider `appDataFolder` or an explicit space.
  - The web path never uses the refresh token (`access_type: offline` is requested but unused in the `jwt` callback), so expired access tokens fail.
- [ ] **2.8 ID collisions** – `src/lib/xlsxParser.ts` and the builder build IDs from `Date.now()` (+ random). Use `crypto.randomUUID()`.
- [ ] **2.9 Web-mode data path** – without `ONEPATH_DATA_DIR`, data lives in `src/data/custom-roadmap.json` via `process.cwd()`, which breaks on read-only/serverless hosts. Make the directory configurable or use a real database.

## 3. Code quality and tooling

- [ ] **3.1 Fix ESLint scope and errors** – add `dist-electron/**`, `desktop/dist/**` to `globalIgnores` in `eslint.config.mjs`, then fix the 39 real errors (`any` in `storage.ts`, `gdrive.ts`, `xlsxParser.ts`; setState-in-effect in `RoadmapContext.tsx`, `Roadmap.tsx`; `prefer-const` in `ProgressContext.tsx`).
- [ ] **3.2 Remove `any` / `@ts-ignore`** – declare a global `Window.desktopAPI` type and type `session.accessToken` (already declared in `src/auth.ts`, so most `@ts-ignore`s are unnecessary); type the Drive payload.
- [ ] **3.3 Add tests** – start with `xlsxParser` round-trip, roadmap API validation, progress logic in `ProgressContext`, and backup payload build/apply (0.2).
- [ ] **3.4 Add CI** – GitHub Action running `lint`, `tsc --noEmit`, `next build`, tests, and `npm audit --omit=dev`.
- [ ] **3.5 Resolve `.gitignore` conflict** – it ignores `CLAUDE.md`, `AGENTS.md`, `.gemini/`, yet `CLAUDE.md`/`AGENTS.md` are tracked.
- [ ] **3.6 Fix docs** – README says Next.js 15 (actual 16.2.10) and calls `/` a "public dashboard" although the proxy requires login for every page.
- [ ] **3.7 Move or delete `plan.md`** – leftover AI prompt at the repo root; move to `docs/` or remove.
- [ ] **3.8 Dependency hygiene**
  - `framer-motion`, `next-mdx-remote`, `date-fns` are not imported anywhere in `src`; remove them (verify with `depcheck`).
  - `@types/dagre` belongs in devDependencies.
- [ ] **3.9 Drop unused images from the installer** – `public/banner.png` + `banner2.png` (~15 MB) are only used by the README but are copied into the installer via `extraResources`. Move them to `docs/`.
- [ ] **3.10 Move electron-builder config** out of `package.json` into `electron-builder.yml`.
- [ ] **3.11 Desktop distribution** – add code signing (avoids SmartScreen warnings), auto-update, and crash reporting.

## 4. Product and UX

- [ ] **4.1 Builder undo + autosave** – currently one global JSON blob, no version history.
- [ ] **4.2 Single-roadmap JSON export/import** alongside Excel (Excel round-trip is lossy).
- [ ] **4.3 Accessibility** – keyboard navigation and screen-reader labels for React Flow nodes, especially in RTL.
- [ ] **4.4 Safer Drive restore** – show timestamps/diff before `CloudRestorePrompt` overwrites local progress and roadmaps.
- [ ] **4.5 Bundle size** – dynamic-import `xlsx` and the radar chart (`recharts`).

---

## Suggested order

1. ~~Stop the data loss (0.1, 0.2)~~ – done.
2. Close the auth holes: desktop-only Credentials provider, admin check on `POST /api/roadmaps` (1.1, 1.2).
3. Upgrade `next` / `next-auth`, move `shadcn` to devDependencies, replace `xlsx` (1.6).
4. Take `authSecret` out of the IPC store and the client secret out of the installer (1.3, 1.4).
5. Schema validation, honest errors, per-request atomic writes, checked save responses (1.2, 2.3, 2.4, 2.5).
6. Lint fixes, tests and CI (3.1–3.4).
7. Electron startup race, OAuth timeout, navigation allowlist (2.1, 2.2, 1.5).
8. Decide on the bilingual data model before the roadmap format spreads further (2.6).
9. Docs, dependency, image and `.gitignore` cleanup (3.5–3.10).
