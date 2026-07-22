# 📊 Excel Template Guide

This document explains the Excel template used to bulk-import roadmaps into the Consultant Roadmap Builder. You can download a pre-filled template from the **Builder Dashboard** (`/builder`) by clicking the **Template** button.

---

## Overview

The Excel file contains **4 sheets**, each representing a different layer of the roadmap data model:

| Sheet | Purpose |
|-------|---------|
| **Roadmap Meta** | General info about the roadmap (title, description, category, radar categories) |
| **Phases** | The learning phases that make up the roadmap |
| **Steps** | Individual steps within each phase |
| **Resources** | Links and materials attached to phases or steps |

> **Important:** Every sheet uses a `Language` column. You must provide **both** `en` and `ar` rows for full bilingual support. If you only need one language, you can leave the other rows out — the parser will fill in defaults.

---

## Sheet 1: Roadmap Meta

Defines the top-level roadmap information.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `Language` | `en` / `ar` | ✅ | Row language |
| `Title` | Text | ✅ | Roadmap title |
| `Description` | Text | ✅ | Short description |
| `Category` | Text | ✅ | Roadmap category (e.g. "General", "عام") |
| `RadarCategories (hyphen separated)` | Text | ❌ | Skill radar axes separated by ` - ` (e.g. `Tech - Business - Project Management`) |

**Example:**

| Language | Title | Description | Category | RadarCategories (hyphen separated) |
|----------|-------|-------------|----------|------------------------------------|
| en | ERP Consultant | Master ERP implementations. | General | Tech - Business - Project Management |
| ar | مستشار ERP | احتراف تنفيذ أنظمة ERP. | عام | تقنية - أعمال - إدارة مشاريع |

---

## Sheet 2: Phases

Defines the learning phases. Each phase is a node on the roadmap graph.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `Language` | `en` / `ar` | ✅ | Row language |
| `PhaseID` | Text | ✅ | Unique ID for the phase (e.g. `phase-1`). Must match across `en` and `ar` rows. |
| `Title` | Text | ✅ | Phase title |
| `Description` | Text | ✅ | Phase description |
| `Category` | Text | ✅ | Category label shown as a badge on the node |
| `EstimatedHours` | Number | ✅ | Estimated hours to complete |
| `Order` | Number | ✅ | Display order (1, 2, 3…) |
| `Prerequisites (comma separated)` | Text | ❌ | Comma-separated list of `PhaseID`s that must be completed first |
| `Objectives (comma separated)` | Text | ❌ | Comma-separated list of learning objectives |
| `Milestones (comma separated)` | Text | ❌ | Comma-separated list of milestones |

**Example:**

| Language | PhaseID | Title | Description | Category | EstimatedHours | Order | Prerequisites (comma separated) | Objectives (comma separated) | Milestones (comma separated) |
|----------|---------|-------|-------------|----------|----------------|-------|---------------------------------|------------------------------|------------------------------|
| en | phase-1 | Fundamentals | Basic concepts. | Tech | 10 | 1 | | Understand basics | Pass quiz |
| en | phase-2 | Advanced Topics | Deep dive into ERP. | Tech | 20 | 2 | phase-1 | Master advanced concepts | Complete project |

> **Note:** The `Prerequisites` column creates the dependency arrows between nodes on the roadmap graph.

---

## Sheet 3: Steps

Defines the granular steps within each phase. Steps appear in the phase detail panel when a user clicks on a phase node.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `Language` | `en` / `ar` | ✅ | Row language |
| `PhaseID` | Text | ✅ | The parent phase this step belongs to (must match a `PhaseID` from the Phases sheet) |
| `StepID` | Text | ✅ | Unique ID for the step (e.g. `step-1-1`). Must match across `en` and `ar` rows. |
| `Title` | Text | ✅ | Step title |
| `Description` | Text | ✅ | Step description |
| `Order` | Number | ✅ | Display order within the phase |

**Example:**

| Language | PhaseID | StepID | Title | Description | Order |
|----------|---------|--------|-------|-------------|-------|
| en | phase-1 | step-1-1 | Install ERP Software | Download and install the ERP system locally. | 1 |
| en | phase-1 | step-1-2 | Navigate the Interface | Learn the main navigation and menus. | 2 |
| ar | phase-1 | step-1-1 | تثبيت نظام ERP | تحميل وتثبيت نظام ERP محلياً. | 1 |
| ar | phase-1 | step-1-2 | التنقل في الواجهة | تعلم التنقل الرئيسي والقوائم. | 2 |

---

## Sheet 4: Resources

Defines links and materials. Resources can be attached to either a **phase** or a **specific step** within a phase.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `Language` | `en` / `ar` | ✅ | Row language |
| `PhaseID` | Text | ✅ | The phase this resource belongs to |
| `StepID (optional)` | Text | ❌ | If provided, the resource is attached to this specific step instead of the phase |
| `ResourceID` | Text | ✅ | Unique ID for the resource (e.g. `res-1`). Must match across `en` and `ar` rows. |
| `Title` | Text | ✅ | Resource title / display name |
| `URL` | Text | ✅ | Link to the resource |

**Example:**

| Language | PhaseID | StepID (optional) | ResourceID | Title | URL |
|----------|---------|-------------------|------------|-------|-----|
| en | phase-1 | | res-1 | ERP Overview Guide | https://example.com/erp-guide |
| en | phase-1 | step-1-1 | res-2 | Installation Walkthrough | https://example.com/install-video |

> **How linking works:**
> - If `StepID (optional)` is **empty** → the resource is attached at the **phase level**.
> - If `StepID (optional)` is **filled** → the resource is attached to that **specific step**.

---

## How to Import

1. Go to the **Builder Dashboard** (`/builder`).
2. Click the **Template** button to download a pre-filled `.xlsx` file.
3. Fill in your roadmap data following the structure above.
4. Click the **Import** button and select your completed `.xlsx` file.
5. The roadmap will be created and appear in the builder list.

---

## ID Matching Rules

- `PhaseID`, `StepID`, and `ResourceID` values **must be identical** between the `en` and `ar` rows. This is how the parser links bilingual content together.
- `PhaseID`s used in the `Prerequisites` column must reference valid `PhaseID`s defined in the same sheet.
- `PhaseID`s used in the Steps and Resources sheets must reference valid `PhaseID`s from the Phases sheet.
- `StepID`s used in the Resources sheet must reference valid `StepID`s from the Steps sheet.
