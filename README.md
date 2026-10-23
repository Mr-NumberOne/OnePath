# OnePath - Consultant Roadmap Builder

<div align="center">
  <img src="public/banner2.png" alt="OnePath Banner" width="950" />
</div>

<p align="center">
  <strong>A modern, interactive platform designed to build custom roadmaps that ease the learning process for everyone and visualize complex career paths.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#excel-import">Excel Import</a>
</p>

---

## 🚀 Features

- **Interactive Node-based Roadmaps**: Visualize complex learning paths and phases using `React Flow` with a fully interactive pan-and-zoom interface.
- **Bilingual Support (RTL/LTR)**: Fully localized in both English and Arabic, seamlessly switching layouts based on user preference.
- **Google Drive Integration**: Securely backup and restore all local progress, roadmaps, and UI preferences directly to/from the user's personal Google Drive.
- **Skill Radar Charts**: Dynamic visualization of a consultant's skill profile using `Recharts`, powered by the categories defined per roadmap.
- **Roadmap Builder Dashboard**: A protected backend UI (`/builder`) requiring Google Authentication for creating, editing, and managing roadmaps.
- **Progress Tracking**: Tracks completed phases and steps, automatically calculating study hours and "Portfolio Score". Progress is persistently stored locally until backed up to the cloud.
- **Dark Mode Support**: Deep integration with `next-themes` and Tailwind CSS to provide a beautiful, seamless dark/light mode toggle.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Authentication**: NextAuth.js v5 (Google OAuth)
- **UI Library**: React 19
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Graph Visualization**: [React Flow](https://reactflow.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 📂 Project Structure

```text
src/
├── app/                  # Next.js App Router (Pages & Layouts)
│   ├── api/              # API Routes (Roadmaps, NextAuth callbacks)
│   ├── builder/          # Roadmap Builder Dashboard and Editor
│   ├── login/            # Google OAuth Login Page
│   ├── profile/          # User Profile & Cloud Backups
│   ├── roadmap/          # Interactive Roadmap Viewer
│   ├── settings/         # App Settings (Theme, Language)
│   └── page.tsx          # Public Dashboard / User Homepage
├── components/           # React Components
│   ├── admin/            # Admin-specific components (PhaseForm)
│   ├── dashboard/        # Dashboard stats and Skill Radar
│   ├── roadmap/          # React Flow renderer and phase details
│   └── ui/               # Reusable Shadcn UI components
├── contexts/             # React Context Providers (Progress, Roadmaps, Settings)
├── data/                 # Local data storage (custom-roadmap.json)
├── lib/                  # Utilities (XLSX parsing, GDrive API wrappers)
└── types/                # TypeScript Interfaces (RoadmapConfig, Phase, etc.)
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Google Cloud Console project (for OAuth and Drive API)

### 1. Google API Setup

To run this application locally, you must configure Google Authentication and the Google Drive API.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable the **Google Drive API** in your project.
4. Navigate to **APIs & Services** > **OAuth consent screen** and configure it. Add the scope `https://www.googleapis.com/auth/drive.file`.

**For Web Development:**
1. Navigate to **APIs & Services** > **Credentials**.
2. Create an **OAuth client ID** for a **Web application**.
3. Set Authorized JavaScript origins to `http://localhost:3000`.
4. Set Authorized redirect URIs to `http://localhost:3000/api/auth/callback/google`.
5. Note your **Client ID** and **Client Secret**.

**For Desktop Development (Electron):**
1. In the same project, click **Create Credentials** -> **OAuth client ID**.
2. Select **Desktop app** as the Application type (Name it "OnePath Desktop" or similar).
3. Google handles loopback redirects automatically for this application type, so you don't need to specify redirect URIs or ports.
4. Note this new **Client ID** (a Secret is provided, but is intentionally not embedded in the desktop bundle).

### 2. Environment Variables

Create a file named `.env.local` in the root of the project:

```env
AUTH_GOOGLE_ID=your_google_client_id_here
AUTH_GOOGLE_SECRET=your_google_client_secret_here
AUTH_SECRET=your_random_secret_string # Generate via: npx auth secret

# Required for Desktop app compilation
AUTH_GOOGLE_DESKTOP_ID=your_google_desktop_client_id_here
AUTH_GOOGLE_DESKTOP_SECRET=your_google_desktop_secret_here
```

> [!NOTE]
> The Desktop ID and Secret are injected into the executable during the build process, so they stay out of source control as long as you keep them inside `.env.local`.
>
> The Desktop secret is **not confidential** once the installer is shipped: anyone can extract it. That is expected — Google's token endpoint still requires it for "Desktop app" clients, but its [installed-app guidance](https://developers.google.com/identity/protocols/oauth2/native-app) treats it as public. Sign-in is protected by PKCE and the loopback redirect instead, and the server only accepts tokens issued to this client ID. Never reuse the **Web** client secret (`AUTH_GOOGLE_SECRET`) for the desktop build.

### 3. Web Development

```bash
# Clone the repository
git clone <repository-url>
cd consoltant-roadmap

# Install dependencies
npm install

# Run the development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### 4. Desktop Development

To develop the application as a desktop app using Electron:

```bash
# Start the desktop development environment (runs Next.js and Electron concurrently)
npm run dev:desktop
```
*Note: This will start a Next.js server on a local port and open an Electron window.*

### 5. Desktop Production Build & Installer

To build the standalone executable and Windows installer:

```bash
npm run pack:windows
```

The installer will be generated at: `dist-electron/OnePath Setup 0.1.0.exe`.

### 6. Code Signing

Currently, the installer is unsigned. To enable code signing:
1. Obtain a valid Windows code signing certificate.
2. Set the appropriate `CSC_LINK` and `CSC_KEY_PASSWORD` environment variables.
3. Re-run `npm run pack:windows`.

## 📊 Excel Import / Export

You can bulk-create roadmaps by importing a structured `.xlsx` file. The template includes 4 sheets covering all roadmap data: metadata, phases, steps, and resources — with full bilingual (EN/AR) support.

> [!TIP]
> **AI-Assisted Roadmap Generation:** To significantly accelerate the roadmap creation process, you may provide the blank Excel template to a Large Language Model (e.g., ChatGPT, Claude, or Gemini) alongside a specific job description or curriculum outline. The AI can be instructed to populate the template's structured sheets, instantly providing you with a comprehensive, ready-to-import roadmap for OnePath.

<details>
<summary><strong>🤖 View Example AI Prompts</strong></summary>

**Example 1: Generating from a Job Description PDF**
```text
I have attached a Job Description PDF and a blank Excel template containing 4 sheets (Roadmap, Phases, Steps, Resources). 

Act as an expert career coach and curriculum designer. Analyze the attached job description and create a comprehensive, sequential learning roadmap required to land this role. 

Fill out the attached Excel template completely. Break the learning process into logical Phases, break those phases down into specific Steps, and provide actionable study Resources. Ensure all ID columns match perfectly across the sheets. Return the fully populated Excel file when finished.
```

**Example 2: Generating a Specific Field (e.g., Data Engineering)**
```text
Act as a Senior Data Engineering Manager and technical trainer. I have attached a blank Excel template with 4 sheets (Roadmap, Phases, Steps, Resources). 

Please design a complete, zero-to-hero "Data Engineering" learning roadmap. The roadmap should cover Python fundamentals, SQL/NoSQL databases, ETL pipelines, Data Warehousing, and Big Data tools (Spark, Kafka). 

Fill out the attached Excel template completely. Assign realistic estimated study hours, and provide realistic resource links (courses, docs) for each step. Ensure all ID references link correctly across the sheets. Return the filled Excel file when finished.
```
</details>

👉 **See [EXCEL.md](EXCEL.md) for the complete template reference**, including column definitions, examples, and ID matching rules.

## ⚙️ Data Storage Architecture

**Web Version:**
- **Roadmap Data:** Stored server-side in a local JSON file at `src/data/custom-roadmap.json`.
- **User Progress:** Stored in the browser's `localStorage` (Offline-first approach).

**Desktop Version (Electron):**
- **Roadmap Data:** Persisted beneath the OS's application-data directory (e.g. `%APPDATA%\OnePath\data\custom-roadmap.json` on Windows).
- **User Progress & Settings:** Intercepted and securely stored in `%APPDATA%\OnePath\preferences.json` to survive dynamic port changes.

**Cloud Backup (Both):**
- Users can authorize Google Drive to safely store an encrypted payload of their progress and roadmaps under `ConsultantRoadmapBackup.json` in their drive.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright © 2026 Mr.Number One. All rights reserved.
