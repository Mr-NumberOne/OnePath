# OnePath – Suggested Improvements

Findings from a project assessment (2026-10-23), with what has been done since. Items are grouped by priority; ticked items are done on branch `fix/desktop-backup-storage`, one commit each.

## Status

| Check | At assessment | Now |
|---|---|---|
| `next build` | passes (Next 16.2.10) | passes (Next 16.4.2) |
| `npm run typecheck` (web + desktop) | passes | passes |
| `npm run lint` | 59 problems (39 errors, 20 warnings)¹ | 0 errors, 6 warnings (`<img>` tags) |
| `npm audit --omit=dev` | 27 (4 critical, 18 high, 5 moderate) | 0 |
| Tests | none | 38 Vitest tests (`npm test`) |
| CI | none | GitHub Actions: lint, typecheck, test, build, audit |

¹ The first report's 14,620 came from linting generated folders.

### Decisions taken

- Single user: the shared roadmap file and the wipe-on-logout / restore-on-login design are intended; any signed-in user may save.
- Desktop OAuth client secret stays in the installer (Google treats it as public); documented instead.
- `xlsx` replaced with the official SheetJS 0.20.3 build.
- English/Arabic phases stay as separate lists, kept in sync by ID.
- Builder: undo/redo plus a local draft (still saved manually).
- Desktop distribution: auto-update from GitHub Releases only (no signing certificate yet, no crash reporting).
- `CLAUDE.md`/`AGENTS.md` stay tracked; `plan.md` moves to `docs/`.

### Not verified by hand yet

Run these in the desktop app before merging:
- Backup & Logout, then log in and restore: progress and language come back (0.2).
- Google sign-in still works after the callback hardening (2.2) and the Next/Auth.js upgrade (1.6).
- A web sign-in older than an hour can still back up to Drive (2.7; refresh path only tested with an invalid token).
- `npm run pack:windows` installer starts (2.1 was tested against the standalone server, not the installer).

---

## 0. Critical – data loss

- [x] **0.1 Logout clears the shared roadmap file (web only)** – closed, no change needed: the app has a single user.
- [x] **0.2 Desktop backup uploaded empty progress; restore did nothing** – backup, restore and the login prompt use `buildBackupPayload()` / `applyBackup()` in `src/lib/backup.ts`, going through `src/lib/storage.ts`; logout clears progress with `removeStoredData()`.

## 1. Security

- [x] **1.1 Restrict the `desktop` Credentials provider** – registered only when `DESKTOP_MODE=true` (or under `next dev`); `authorize` checks the token with Google's tokeninfo (audience must be the desktop client ID) and takes the profile from Google. Desktop login tested.
- [x] **1.2 Lock down `/api/roadmaps`** – `GET` and `POST` need a session; `POST` caps the body at 5 MB and validates it with a zod schema (`src/lib/roadmapSchema.ts`). `RoadmapProvider` reloads once the session is authenticated.
- [x] **1.3 `authSecret` exposed to the renderer** – moved to `auth-secret.enc` (encrypted with `safeStorage` when available) and migrated from `preferences.json`; store IPC only accepts the progress/language keys, as strings.
- [x] **1.4 Google client secret in the installer** – kept by decision; README and `scripts/generate-env.js` explain why it is public and that PKCE protects sign-in.
- [x] **1.5 Tighten Electron navigation** – the window only navigates within the local app (127.0.0.1/localhost on its port); other web links open in the browser; URL parsing is guarded.
- [x] **1.6 Vulnerable dependencies** – `next` 16.4.2, `next-auth` 5.0.0-beta.32, `shadcn` moved to devDependencies, `xlsx` 0.20.3 from cdn.sheetjs.com, `npm audit fix`.
- [x] **1.7 Missing `safeStorage`** – the refresh token is never stored unencrypted; the login page warns when the sign-in can't be remembered, and sign-in failures show a toast.

## 2. Correctness and reliability

- [x] **2.1 Server startup race** – the server is polled over HTTP for up to 30 s (a cold start took ~13 s); early exits reject at once; page-load retries stop after 5; start-up failures show an error dialog.
- [x] **2.2 OAuth loopback server** – 5-minute timeout, OAuth `state` check, 404 for stray requests, escaped callback page, server always closed once.
- [x] **2.3 Error masking in `GET`** – only a missing file means "no roadmaps"; read/parse errors return 500.
- [x] **2.4 Concurrent writes** – writes are queued and use a unique temp file each; tested with 20 concurrent saves.
- [x] **2.5 Builder saves ignored failures** – every save goes through `saveRoadmaps()` (`src/lib/roadmapApi.ts`), which throws on non-2xx; restores save roadmaps before touching local progress.
- [x] **2.6 Bilingual data model** – kept as separate lists; the editor mirrors structural changes (add/delete phase, steps, resources, order, hours, prerequisites) to the other language by ID (`src/lib/roadmapSync.ts`). Existing differences are kept.
- [x] **2.7 Google Drive** – picks the newest backup; web sessions refresh the access token on the server; expired desktop sessions are renewed through the Electron bridge (`src/lib/driveToken.ts`).
- [x] **2.8 ID collisions** – `generateId()` in `src/lib/utils.ts` uses `crypto.randomUUID()`.
- [x] **2.9 Web-mode data path** – `ONEPATH_DATA_DIR` documented in `.env.example` and the README.

## 3. Code quality and tooling

- [x] **3.1 ESLint scope and errors** – build output ignored; hook, unused-code and `@ts-ignore` errors fixed (also fixed in-place `.sort()` on props/state in the builder).
- [x] **3.2 Remove `any` / `@ts-ignore`** – `window.desktopAPI` and session/JWT fields are typed; the Excel parser reads typed rows.
- [x] **3.3 Add tests** – Vitest 4 (Vitest 5 needs `@types/node` 22+): API route, Excel parser, backup, sync and schema. Progress logic in `ProgressContext` is still untested (it lives inside the React provider).
- [x] **3.4 Add CI** – `.github/workflows/ci.yml`.
- [ ] **3.5 Resolve `.gitignore` conflict** – it ignores `CLAUDE.md`, `AGENTS.md`, `.gemini/`, yet `CLAUDE.md`/`AGENTS.md` are tracked.
- [x] **3.6 Fix docs** – README now lists Next.js 16, Node 20.9+, the desktop/test tooling, test and CI commands, says every page needs sign-in, and no longer calls the Drive backup "encrypted" (it is plain JSON in the user's Drive).
- [ ] **3.7 Move `plan.md`** – leftover AI prompt at the repo root; move to `docs/`.
- [x] **3.8 Dependency hygiene** – removed `framer-motion`, `next-mdx-remote`, `date-fns`; `@types/dagre` is a devDependency.
- [ ] **3.9 Drop unused images from the installer** – `public/banner.png` + `banner2.png` (~15 MB) are only used by the README.
- [ ] **3.10 Move electron-builder config** out of `package.json` into `electron-builder.yml`.
- [ ] **3.11 Desktop distribution** – auto-update from GitHub Releases (decision: no signing or crash reporting for now).

## 4. Product and UX

- [ ] **4.1 Builder undo/redo + local draft** – decision: no autosave to the server.
- [ ] **4.2 Single-roadmap JSON export/import** alongside Excel (Excel round-trip is lossy).
- [ ] **4.3 Accessibility** – keyboard navigation and screen-reader labels for React Flow nodes, especially in RTL.
- [ ] **4.4 Safer Drive restore** – show timestamps/diff before `CloudRestorePrompt` overwrites local progress.
- [ ] **4.5 Bundle size** – dynamic-import `xlsx` and the radar chart (`recharts`).

---

## Remaining order

1. Repo cleanup (3.5, 3.7, 3.9, 3.10).
2. Auto-update (3.11).
3. Product items (4.1–4.5).
