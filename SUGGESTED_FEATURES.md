# OnePath – Suggested New Features

Ideas for making OnePath more useful and more fun to study with. They are new features, separate from the fixes in [IMPROVEMENTS.md](IMPROVEMENTS.md). Each one notes what already exists in the code to build on, and a rough size: **S** (a day or two), **M** (about a week), **L** (several weeks).

OnePath has a single user, so none of these assume accounts, teams or a shared server.

## At a glance

| # | Feature | Area | Size | Why it stands out |
|---|---|---|---|---|
| 1 | Study plan with a target date | Progress | M | Turns a roadmap into a week-by-week schedule |
| 2 | Real study-time tracking | Progress | S | Study hours are currently estimates, not time spent |
| 3 | Interview practice mode | Practice | M | The `InterviewQuestion` type already exists, unused |
| 4 | Portfolio projects per phase | Practice | M | The `Project` type already exists, unused |
| 5 | Achievements and streaks | Motivation | S | `achievements` is tracked and shown, but never earned |
| 6 | Notes and reflections per step | Learning | S | Keeps what you learned next to where you learned it |
| 7 | Quick search across everything | Navigation | S | A command palette component is already installed |
| 8 | AI roadmap generator in the builder | Authoring | M | The README already describes this as a manual workflow |
| 9 | One-click translation of the other language | Authoring | S | Phase sync now creates copies that need translating |
| 10 | Skill gap vs. a job description | Insight | M | Extends the existing skill radar |
| 11 | Timeline and critical-path view | Visualization | M | Shows how long the roadmap really takes |
| 12 | Completion certificate (PDF) | Sharing | S | Something to show for finishing a roadmap |
| 13 | Broken link checker for resources | Authoring | S | Imported and AI-written links go stale |
| 14 | Richer resources (type, duration, done) | Learning | S | The `Resource` type and `completedResources` exist, unused |
| 15 | Study reminders in the desktop app | Desktop | S | Native notifications and a tray icon |
| 16 | Automatic Drive sync | Sync | M | Backups happen without remembering to click |
| 17 | Shareable roadmap file | Sharing | S | Send a roadmap to a friend as one file |
| 18 | Installable web app (PWA) with offline use | Platform | M | `site.webmanifest` exists but is empty |

---

## Progress and planning

### 1. Study plan with a target date — M
Pick a roadmap, a target date and how many hours a week you can study. OnePath spreads the phases across the weeks in prerequisite order, shows this week's phases and steps on the home page, and says whether you're ahead, on track or behind.

- **Builds on:** `estimatedHours` and `prerequisites` on each phase, and the dagre graph layout already used to order phases.
- **Nice touch:** re-plan automatically when you fall behind, instead of showing a wall of overdue items.

### 2. Real study-time tracking — S
Add a start/stop study timer (optionally Pomodoro-style) to the phase panel. Log real minutes per phase and step, and show actual vs. estimated hours.

- **Why:** `studyHours` is currently the sum of the estimates of completed phases, so it says nothing about real effort.
- **Builds on:** `RoadmapProgress.studyHours` and the phase detail panel.

## Practice

### 3. Interview practice mode — M
Each phase gets interview questions. Practice mode shows a question, lets you answer (typed or out loud), then reveals the expected answer, the evaluation criteria and common mistakes, and asks you to rate yourself. Weak questions come back more often, spaced-repetition style.

- **Builds on:** the unused `InterviewQuestion` type (`expectedAnswer`, `evaluationCriteria`, `commonMistakes`) and the unused `completedInterviewQuestions` progress field.
- **Excel:** add an "Interview Questions" sheet to the template so they can be imported like steps.

### 4. Portfolio projects per phase — M
Attach realistic projects to phases (scenario, requirements, deliverables, difficulty, hours). Mark deliverables as done and link to your own work (a GitHub repo, a document). Completed projects count towards the portfolio score.

- **Builds on:** the unused `Project` type and the unused `completedProjects` progress field.
- **Why:** `portfolioScore` is currently just completed phases × 100; real projects would make it mean something.

## Motivation

### 5. Achievements and streaks — S
Award badges for milestones: first phase done, 7-day study streak, a full category on the radar, all interview questions in a phase rated "confident", a roadmap finished. Show a streak counter on the home page.

- **Builds on:** the unused `Achievement` type (with an `icon` and a `condition` identifier) and the `achievements` progress field, which the home page already labels but never fills.

## Learning

### 6. Notes and reflections per step — S
A small Markdown notes box on every step and phase, saved with your progress (so it's included in Drive backups). Add a "My notes" page that collects all notes for a roadmap, ready to revise from or export.

- **Builds on:** the progress storage in `src/lib/storage.ts` and the backup payload in `src/lib/backup.ts`.

### 14. Richer resources — S
Let each resource have a type (video, course, book, docs, article), a duration and a "done" tick. Show icons, total time per phase, and progress through the resources.

- **Builds on:** the unused `Resource` type (which already has `type` and `duration`) and the unused `completedResources` progress field. Today resources are just a title and a URL.

## Navigation

### 7. Quick search across everything — S
Press Ctrl+K to search every roadmap, phase, step, resource and note, in either language, and jump straight to it.

- **Builds on:** `src/components/ui/command.tsx` (a `cmdk` command palette) is already in the project but not used anywhere.

## Authoring

### 8. AI roadmap generator in the builder — M
Paste a job description or upload a PDF, choose a level and the hours available, and get a draft bilingual roadmap (phases, steps, resources, radar categories) in the builder to review and edit before saving.

- **Builds on:** the README's "AI-assisted roadmap generation" prompts, the Excel structure in `src/lib/xlsxParser.ts`, and the roadmap schema in `src/lib/roadmapSchema.ts`, which can validate the AI's output before it reaches the builder.
- **Needs:** an LLM API key (for example, Claude) kept on the server or in the desktop app, never in the page.

### 9. One-click translation of the other language — S
When the bilingual sync copies a new phase or step into the other language, mark it "needs translation" and offer a "Translate" button (AI-assisted, editable before saving). Show a count of untranslated items per roadmap.

- **Builds on:** `src/lib/roadmapSync.ts`, which already creates the copied items.

### 13. Broken link checker for resources — S
A "Check links" button in the builder that tests every resource URL and flags dead or redirected ones, with a quick way to fix or remove them.

- **Why:** links written by hand, imported from Excel or suggested by AI break over time.
- **Note:** the check should run on the server or in the desktop app, since browsers block most cross-site requests.

## Insight and visualization

### 10. Skill gap vs. a job description — M
Paste a job description; OnePath maps its requirements onto the roadmap's radar categories and overlays a "target" shape on your current skill radar. The biggest gaps link straight to the phases that close them.

- **Builds on:** `src/components/dashboard/SkillRadar.tsx`, which already computes per-category completion from phase categories. Pairs well with feature 8.

### 11. Timeline and critical-path view — M
A Gantt-style view next to the graph: phases as bars sized by estimated hours, prerequisites as arrows, and the critical path (the longest chain of prerequisites) highlighted, so you can see the minimum time to finish.

- **Builds on:** `prerequisites` and `estimatedHours`; the dependency ordering already exists for the graph layout.

## Sharing

### 12. Completion certificate (PDF) — S
When a roadmap is finished, generate a bilingual certificate (name, roadmap, date, hours, skills covered), plus an optional one-page summary of completed phases and projects for a CV or LinkedIn.

- **Builds on:** progress data and the radar categories.

### 17. Shareable roadmap file — S
Export one roadmap as a single file (or a link to a file in your Drive) that someone else can import into their own OnePath, with progress left out.

- **Builds on:** the JSON export/import planned in IMPROVEMENTS.md (4.2); this adds a friendly share and import flow on top.

## Desktop and sync

### 15. Study reminders in the desktop app — S
Native notifications at the times you choose ("Time for 30 minutes of Phase 3"), a tray icon with today's goal, and an option to start OnePath with Windows.

- **Builds on:** the Electron main process in `desktop/main.ts`; pairs with the study plan (1).

### 16. Automatic Drive sync — M
Back up to Drive automatically (on changes, at most every few minutes, and on close), and on start-up offer to pull a newer backup from another device instead of always asking at login.

- **Builds on:** `src/lib/backup.ts`, `src/lib/gdrive.ts` and the token refresh in `src/lib/driveToken.ts`. The restore preview planned in IMPROVEMENTS.md (4.4) is a good companion.

### 18. Installable web app with offline use — M
Make the web version installable on phones and desktops, and cache the app shell so progress can be viewed and ticked offline, syncing when back online.

- **Builds on:** `public/site.webmanifest`, which exists with icons but has an empty name.

---

## Suggested starting points

- **Quick wins (S):** 7 (search), 5 (achievements), 6 (notes) and 14 (richer resources) mostly use code and types that already exist.
- **Biggest value (M):** 1 (study plan) and 3 (interview practice) change OnePath from a checklist into a study coach.
- **Most distinctive:** 8 (AI generator) with 9 (translation) and 10 (skill gap) make authoring bilingual roadmaps much faster than doing it by hand.
