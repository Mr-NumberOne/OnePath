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
5. Navigate to **APIs & Services** > **Credentials**.
6. Create an **OAuth client ID** for a **Web application**.
7. Set Authorized JavaScript origins to `http://localhost:3000`.
8. Set Authorized redirect URIs to `http://localhost:3000/api/auth/callback/google`.
9. Note your **Client ID** and **Client Secret**.

### 2. Environment Variables

Create a file named `.env.local` in the root of the project:

```env
AUTH_GOOGLE_ID=your_google_client_id_here
AUTH_GOOGLE_SECRET=your_google_client_secret_here
AUTH_SECRET=your_random_secret_string # Generate via: npx auth secret
```

### 3. Installation & Running

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

- **Main Dashboard**: `http://localhost:3000`
- **Builder Interface**: `http://localhost:3000/builder` (Requires Sign In)

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

- **Roadmap Data:** Stored server-side in a local JSON file at `src/data/custom-roadmap.json`.
- **User Progress:** Stored in the browser's `localStorage` (Offline-first approach).
- **Cloud Backup:** Users can authorize Google Drive to safely store an encrypted payload of their progress and roadmaps under `ConsultantRoadmapBackup.json` in their drive.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright © 2026 Mr.Number One. All rights reserved.
