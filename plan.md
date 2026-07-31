
You are a senior desktop application and Next.js engineer. Convert the following existing Next.js application into a production-ready Electron desktop application:

Repository: this current project

## Objective

Create a secure, installable desktop edition of OnePath that preserves its existing functionality and user experience.

The desktop application must:

- Run as a native desktop window.
- Work on Windows as the primary target.
- Produce a Windows installer.
- Preserve the existing Next.js UI, routing, roadmap builder, Excel import/export, localization, themes, progress tracking, authentication, and Google Drive backup features.
- Store writable application data in the operating system’s application-data directory.
- Never modify files inside the installed application bundle.
- Start without requiring the user to install Node.js separately.
- Use secure Electron defaults.
- Keep normal web development and deployment workflows working where reasonably possible.

Do not replace Next.js or rewrite the application in another frontend framework.

## Existing architecture

Inspect the repository before making changes. Do not assume this summary is exhaustive.

The application currently uses:

- Next.js App Router
- React and TypeScript
- NextAuth/Auth.js with Google OAuth
- Google Drive API integration
- Next.js route handlers
- A roadmap API at `/api/roadmaps`
- Server-side filesystem access
- JSON-based roadmap persistence
- Browser `localStorage` for progress and settings
- Dynamic routes
- Excel import/export
- English and Arabic layouts
- Tailwind CSS and shadcn/ui

Known relevant files include:

- `src/auth.ts`
- `src/middleware.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/roadmaps/route.ts`
- `src/lib/gdrive.ts`
- `src/contexts/RoadmapContext.tsx`
- `src/contexts/ProgressContext.tsx`
- `next.config.ts`
- `package.json`

The current roadmap API writes to a path under `src/data`. That approach is unsuitable for an installed desktop application and must be replaced.

## Required approach

Use Electron as the desktop shell and run the production Next.js application through a bundled local server.

The intended runtime architecture is:

1. Electron starts.
2. The Electron main process selects a free loopback port.
3. It launches the bundled Next.js standalone server bound only to `127.0.0.1`.
4. It waits until the server is ready.
5. It opens the local address in an Electron `BrowserWindow`.
6. When Electron exits, it terminates the local server cleanly.

Use Next.js standalone output unless repository inspection establishes a better supported production method.

Do not use the Next.js development server in packaged builds.

## Phase 1: Audit and baseline

Before implementing anything:

1. Clone and inspect the repository.
2. Read its README and environment-variable documentation.
3. Identify:
   - All route handlers.
   - All server-only modules.
   - Every filesystem read and write.
   - Every use of `process.cwd()`.
   - All authentication and authorization boundaries.
   - Every external network service.
   - Every location that assumes `localhost:3000`.
   - Every browser storage key.
   - Any use of Node APIs in client components.
4. Install dependencies using the repository’s existing lockfile.
5. Run the existing lint, type-check, tests, and production build.
6. Record any pre-existing failures separately from regressions introduced by this work.
7. Preserve unrelated behavior and avoid unnecessary refactoring.

## Phase 2: Desktop project structure

Add a clean Electron structure, such as:

```text
desktop/
  main.ts
  preload.ts
  server.ts
  security.ts
  types.ts
```

A different structure is acceptable if it is clearer and well documented.

Configure TypeScript compilation for Electron separately from the Next.js client build where necessary.

Add package scripts with clear responsibilities, including equivalents of:

- Web development
- Electron development
- Production Next.js build
- Electron main-process build
- Packaged desktop build
- Windows installer build
- Lint
- Type-check
- Tests

A developer should be able to start the desktop development environment with one documented command.

Avoid fragile shell-specific scripts when a cross-platform Node script is more reliable.

## Phase 3: Next.js production integration

Update `next.config.ts` for a standalone production build.

Ensure the packaged application includes all required standalone artifacts:

- Standalone server files
- `.next/static`
- `public`
- Required runtime dependencies
- Any runtime configuration or seed assets

Do not assume Next.js copies every required asset into the standalone directory automatically. Explicitly verify the final packaged layout.

The production Electron build must not depend on:

- The source tree being present
- A globally installed Node.js
- `next dev`
- A fixed working directory
- Port 3000 being available

Use absolute paths derived from Electron runtime paths and packaged resources.

## Phase 4: Local server lifecycle

Implement robust local server management.

Requirements:

- Bind exclusively to `127.0.0.1`, not `0.0.0.0`.
- Select an available port dynamically.
- Handle port-selection races.
- Pass the selected origin into the Next.js/Auth.js environment.
- Wait for a health check before creating or showing the main window.
- Use a bounded startup timeout.
- Show a user-friendly failure dialog if startup fails.
- Capture useful server diagnostics without exposing secrets.
- Shut down the child process cleanly on application exit.
- Prevent orphaned server processes.
- Handle unexpected server termination.
- Avoid spawning multiple servers during normal Electron lifecycle events.
- Support Windows process behavior correctly.
- Use the Electron-bundled Node runtime or another packaging-safe mechanism.

Add a lightweight health endpoint if one does not already exist.

## Phase 5: Writable data storage

Replace writes to `src/data/custom-roadmap.json`.

In desktop mode, persist roadmap data beneath Electron’s application-data location, equivalent to:

```text
app.getPath("userData")/data/custom-roadmap.json
```

Because Next.js runs in a separate process, pass the resolved data directory through a narrowly scoped environment variable such as:

```text
ONEPATH_DATA_DIR
```

Create a reusable server-only storage module responsible for:

- Resolving the correct data location
- Creating the data directory
- Initializing the roadmap file
- Reading and validating roadmap data
- Writing data safely
- Recovering sensibly from a missing file
- Reporting malformed JSON clearly
- Performing atomic writes using a temporary file followed by replacement
- Avoiding concurrent writes that corrupt data

For normal web mode, retain a documented fallback storage location. Do not silently write to unexpected production paths.

If the repository contains initial roadmap data, copy it into the user-data directory on first launch. Never overwrite existing user data during upgrades.

Consider a versioned migration mechanism so future data schema changes can be applied safely.

## Phase 6: API security

Audit `/api/roadmaps` and every mutating route.

Currently, application middleware may exclude API routes, so UI protection alone must not be treated as API authorization.

Implement explicit authorization for mutations:

- Require an authenticated session for roadmap creation, editing, deletion, import, restore, or replacement.
- Return `401` for unauthenticated requests.
- Return `403` where a signed-in user lacks the required permission.
- Validate request bodies at runtime.
- Limit request sizes to a reasonable value.
- Do not trust client-provided file paths.
- Do not expose arbitrary filesystem access.

If the application has no administrator model, document and implement a clear desktop-appropriate authorization policy. Preserve the intended single-user experience without leaving mutating endpoints unprotected.

Do not weaken authentication merely because the server binds to loopback.

## Phase 7: Electron security

Apply secure Electron defaults.

The main window must use:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` where compatible
- A narrowly scoped preload script
- No deprecated remote module
- No unrestricted IPC
- No arbitrary command execution
- No renderer access to filesystem APIs

Additional protections:

- Deny unexpected permission requests.
- Prevent navigation to untrusted origins.
- Handle `window.open` securely.
- Open approved external HTTP/HTTPS links in the operating system’s default browser.
- Block `file:`, `javascript:`, and other unexpected URL schemes.
- Limit the main window to the exact loopback origin selected at launch.
- Add an appropriate Content Security Policy if the existing app lacks one.
- Do not disable web security.
- Do not ignore certificate errors.
- Do not expose environment secrets to renderer code.
- Avoid placing OAuth client secrets or tokens in logs.

Only expose IPC methods that the application genuinely needs. Validate every IPC argument in the main process.

## Phase 8: Google authentication

Preserve Google sign-in and Google Drive backup.

Account for the fact that the desktop server uses a dynamic local port. Investigate Google OAuth and Auth.js constraints before choosing an implementation.

Preferred design goals:

- Use the system browser for authentication where practical.
- Do not embed Google credentials in insecure renderer code.
- Do not hardcode a single development callback URL into packaged builds.
- Protect state, nonce, PKCE values, sessions, and callback handling.
- Return the user safely to the desktop application.
- Provide understandable errors when credentials or redirect configuration are missing.
- Keep tokens out of logs and persistent plaintext storage where avoidable.

If Google’s OAuth configuration cannot safely support arbitrary dynamic redirect ports with the current web-client flow, implement one of these documented alternatives:

1. Reserve a stable loopback callback port and fail gracefully if it is unavailable.
2. Use a Google OAuth client type and loopback flow intended for installed applications.
3. Use an application protocol callback if fully supported by the selected libraries and Google configuration.
4. Keep authentication on a trusted hosted origin and return authorization to the desktop application securely.

Do not invent an OAuth flow. Follow current Google and Auth.js guidance.

Update the README with exact Google Cloud Console configuration for development and packaged desktop use.

If authentication needs a significant architectural change, keep that change isolated behind an authentication adapter.

## Phase 9: Session and secret management

Do not ship a universal hardcoded `AUTH_SECRET`.

Create or obtain a unique secret per installation and store it securely. Prefer the operating system credential store through a maintained Electron-compatible library. If that is not practical, use a protected file in the user-data directory with restrictive permissions and document the tradeoff.

Handle session persistence across application restarts intentionally.

Document where the following values come from and where they are stored:

- Google client ID
- Google client secret, if still required
- Auth/session secret
- Access and refresh tokens
- User roadmap data
- Local progress
- Preferences

Never commit real credentials.

Provide an updated `.env.example` containing placeholders only.

## Phase 10: Local storage and backups

Preserve existing browser storage where it remains appropriate:

- Progress
- Theme
- Language
- Other preferences

Verify persistence across:

- Window reloads
- Electron restarts
- Application upgrades
- OAuth redirects
- Next.js server port changes

Since Chromium storage is origin-sensitive, a changing port can create a new origin and make existing `localStorage` appear lost. Address this explicitly.

Choose and implement one of these approaches:

- Use a stable local origin/port with collision handling.
- Move important persisted state into the server-side user-data store.
- Provide controlled preload IPC persistence.
- Migrate legacy browser storage into durable desktop storage.

The final design must not lose user progress simply because the local server port changes.

Ensure Google Drive backup and restore include all intended data consistently.

Validate restored data before applying it. Never overwrite valid local data with malformed or incomplete backup data without confirmation or recovery options.

## Phase 11: Desktop behavior

Implement standard desktop behavior:

- Sensible default window dimensions
- A reasonable minimum window size
- Persisted window size and position
- Restoration that keeps the window visible when monitor arrangements change
- Application icon
- Proper application title
- Single-instance lock
- Focus the existing window if the user launches the app twice
- Correct Windows close and quit behavior
- External links opening outside Electron
- Graceful offline behavior
- User-friendly error messages
- Loading/splash behavior while Next.js starts

Do not add a tray icon unless it provides a clear product benefit.

Keep developer tools disabled in packaged production builds unless enabled through an explicit diagnostic flag.

## Phase 12: Packaging and installer

Use a maintained Electron packaging solution such as `electron-builder` or Electron Forge. Explain the choice briefly.

Configure:

- Application name: OnePath
- Stable application ID
- Windows installer
- Correct icons
- Version derived from `package.json`
- Packaged resource rules
- Exclusion of source-only and development-only files
- Clean uninstall behavior
- Preservation of user data during ordinary upgrades
- Appropriate installer metadata
- Architecture target, at minimum Windows x64

Generate an installer artifact such as:

```text
OnePath Setup <version>.exe
```

Do not claim code signing is configured unless valid signing credentials are provided. Document how signing can be enabled later and clearly identify unsigned-build warnings.

Structure the configuration so macOS and Linux targets can be added later without rewriting the desktop integration.

## Phase 13: Updates

Prepare the architecture for future auto-updates but do not enable insecure or nonfunctional updates.

If implementing automatic updates:

- Use signed releases.
- Use HTTPS.
- Verify update integrity.
- Provide visible update status and errors.
- Never point production builds at an untrusted update source.

If signing and release infrastructure are unavailable, document auto-update as future work rather than shipping a broken updater.

## Phase 14: Development workflow

Provide a productive development workflow.

The desktop development command should:

- Start Next.js in development mode.
- Start or compile the Electron main process.
- Wait for the web server.
- Open Electron.
- Shut down related child processes when development stops.

Support live reload where practical without making production depend on development tooling.

Clearly separate development behavior from production behavior using explicit configuration, not unreliable heuristics.

## Phase 15: Testing

Add tests proportional to the risk of the conversion.

At minimum, test:

### Storage

- First-run initialization
- Reading existing roadmap data
- Atomic writes
- Malformed JSON handling
- Concurrent writes
- Data migration
- Upgrade behavior that preserves existing files

### Authentication and API

- Unauthenticated roadmap mutation is rejected
- Authorized mutation succeeds
- Invalid payload is rejected
- Oversized payload is rejected
- Sensitive values are not returned to the client

### Electron

- The local server starts.
- The health endpoint becomes ready.
- The main window loads successfully.
- Only one application instance is allowed.
- External links do not navigate the Electron window.
- Disallowed origins are blocked.
- Server shutdown does not leave orphan processes.

### Application behavior

- Existing roadmaps load.
- Builder changes persist after restart.
- Progress persists after restart.
- English and Arabic layouts work.
- Theme selection persists.
- Excel import and export still work.
- Google sign-in failure is presented clearly.
- Google Drive backup and restore work when valid credentials are supplied.

Use mocks for external Google services in automated tests. Do not require real user credentials in CI.

## Phase 16: Verification

Before declaring completion:

1. Run lint.
2. Run TypeScript checks.
3. Run automated tests.
4. Run the Next.js production build.
5. Run the Electron compilation.
6. Build the Windows installer.
7. Install or unpack the generated application.
8. Launch it outside the repository directory.
9. Verify it does not require a globally installed Node.js.
10. Create or import a roadmap.
11. Restart the application and verify persistence.
12. Confirm data is stored under the user-data directory.
13. Confirm no installed application file is modified at runtime.
14. Confirm external navigation is handled securely.
15. Confirm application exit terminates the local server.
16. Confirm a second launch focuses the existing instance.
17. Inspect the packaged contents for missing assets and accidental secrets.
18. Record the final installer location and size.

Do not treat a successful installer build as sufficient verification. Launch and exercise the packaged application.

## Required deliverables

Produce:

1. All source-code changes.
2. Electron main and preload code.
3. Local Next.js server lifecycle management.
4. Safe application-data persistence.
5. API authorization and validation.
6. Windows packaging configuration.
7. Application icons and metadata, reusing existing branding where suitable.
8. Automated tests.
9. Updated `.env.example`.
10. Updated README containing:
    - Prerequisites
    - Web development instructions
    - Desktop development instructions
    - Production desktop build instructions
    - Google OAuth configuration
    - Data-storage locations
    - Troubleshooting
    - Installer output location
    - Code-signing notes
11. A concise migration note explaining differences between the web and desktop versions.
12. A final implementation report.

## Implementation standards

- Use TypeScript.
- Follow the repository’s existing formatting and naming conventions.
- Prefer small, focused modules.
- Avoid `any` unless unavoidable and justified.
- Validate data crossing process, API, IPC, and backup boundaries.
- Avoid adding dependencies when platform or existing capabilities are sufficient.
- Use maintained dependencies when adding packages.
- Do not commit build outputs unless the repository explicitly expects them.
- Do not delete or silently disable existing features.
- Do not conceal failed checks.
- Do not include secrets.
- Keep the web version functional unless a documented constraint makes that impossible.
- Make commits logically grouped if commit access is available.
- Avoid unrelated visual redesigns.

## Decision log

For significant choices, add a short decision log to the final report covering:

- Why Electron was selected.
- How the Next.js server is bundled and launched.
- How the local origin is kept stable for storage.
- Where roadmap and preference data are stored.
- How Google OAuth works in the packaged application.
- How secrets are protected.
- How API mutations are authorized.
- Why the chosen packaging tool was selected.
- What remains before public distribution, especially code signing.

## Final response format

At completion, report:

1. Summary of the implemented architecture.
2. Important files added or modified.
3. Security improvements.
4. Data migration and storage behavior.
5. Authentication behavior and required configuration.
6. Commands for development, testing, and installer creation.
7. Verification results, including all failures or skipped checks.
8. Exact installer artifact path.
9. Known limitations.
10. Recommended next steps for code signing and releases.

Do not stop after producing a proposal. Implement the conversion, test it, build the installer, and resolve problems until the packaged application launches successfully. If blocked by credentials, signing certificates, or another external requirement, complete all independent work, provide a safe mock or documented fallback, and identify the exact remaining blocker.