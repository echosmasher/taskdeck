# TaskDeck — Shared Task Tracking for Office Departments

> **Spec version 1.0 — ready for implementation.**
> Working name "TaskDeck" — rename freely. This is a portfolio project intended for a **public GitHub repo** linked from a resume. Code quality, README polish, and a frictionless demo experience are first-class requirements, not afterthoughts.

---

## 1. Purpose

A web application for any office department (e.g. an accounting department with A/R, A/P and R2R subgroups) that needs:

1. A **live overview** of outstanding tasks across a group or department.
2. **Documentation/audit evidence** that required tasks have been completed — every completion is stamped with user, date and time, and every state change is logged.

Typical use case: month-end close checklists in a finance shared service center, but the design is generic to any recurring-task department.

## 2. Tech stack

- **Framework:** Next.js (latest stable, App Router), TypeScript strict mode
- **Backend/DB/Auth:** Supabase (Postgres, Supabase Auth, Row Level Security)
- **Styling:** Tailwind CSS. Clean, professional look; light theme default. Use shadcn/ui or comparable headless components for tables, dialogs, selects, date pickers
- **Deployment target:** Vercel (app) + Supabase hosted project
- **Testing:** Vitest for unit tests (recurrence/working-day logic especially), Playwright for a small set of E2E smoke tests
- **CI:** GitHub Actions — lint, typecheck, unit tests on every push; badge in README

## 3. Roles and access

| Role | Capabilities |
|---|---|
| **Master admin** | Everything an admin can do, plus grant/revoke admin role. Exactly one is seeded (see §12) |
| **Admin** | Manage tasks, companies, dimensions, teams, members; edit the office calendar; complete/reopen any task |
| **Member** | See and use the **Dashboard** (own tasks + optional all-tasks view), complete/N/A/reopen tasks assigned to them or their team, **view** the office calendar. No access to the Tasks, Companies, or Teams & Members admin pages |

Enforce access both in the UI (hide admin nav items) and in the database (RLS policies + Postgres roles/claims). Never rely on UI hiding alone.

## 4. Data model

Implement as Supabase migrations (SQL files in the repo). Suggested tables — adjust names to taste but keep the semantics:

- **profiles** — extends `auth.users`: `id (uuid, FK auth.users)`, `full_name`, `email`, `position`, `team_id (nullable — "no team" allowed for cross-functional staff)`, `role ('master_admin' | 'admin' | 'member')`, `is_archived`
- **teams** — `id`, `name`, `is_archived`. Any number of teams. An empty team (no members) triggers a UI warning but is allowed
- **companies** — `id`, `name`, `is_archived`. Country and Brand are NOT columns — they are seeded dimensions (next bullet), so all dimensions work identically
- **dimensions** — `id`, `name` (e.g. Country, Brand, Size). Country and Brand are seeded by default; admins can add more
- **dimension_values** — `id`, `dimension_id`, `value` (e.g. Norway, Sweden; Nordvik, Havstad; Small, Medium, Large)
- **company_dimension_values** — `company_id`, `dimension_value_id`. One value per company per dimension
- **tasks** — the task definition: `id`, `title`, `description`, `assignee_type ('team' | 'person')`, `assignee_team_id` / `assignee_profile_id` (exactly one set, enforce with a CHECK constraint), `scope` (jsonb array of dimension_value ids the task applies to; empty = applies generally), `recurrence` (see §6), `deadline_rule` (see §6), `is_archived`, `created_by`, `created_at`
- **task_instances** — one row per due occurrence of a task **per company**: `id`, `task_id`, `company_id`, `due_date`, `status ('open' | 'completed' | 'na')`, `status_set_by`, `status_set_at`, `na_reason (nullable)`. Unique on `(task_id, company_id, due_date)`
- **task_events** — append-only audit log: `id`, `task_instance_id`, `event ('created' | 'completed' | 'marked_na' | 'reopened' | 'reassigned' | 'edited')`, `actor_profile_id`, `occurred_at`, `details (jsonb)`
- **calendar_entries** — `profile_id`, `date`, `status ('in_office' | 'remote' | 'out_of_office' | 'sick' | 'sick_leave' | 'parental_leave' | 'business_travel')`, unique on `(profile_id, date)`
- **holidays** — `date`, `name`, `country_code` — used by working-day calculation. Seed NO/SE/DK public holidays for the current and next year

**Archiving, never deleting.** Companies, teams, members and tasks with history are soft-deleted (`is_archived = true`) so the audit trail survives. Hard delete is only permitted for records with zero task history.

## 5. Task model (decided)

A task definition **fans out into one instance per company in scope**, and each company's instance must be checked off individually — this is the audit evidence. Example: "Reconcile bank accounts — Brand: Nordvik" with 8 Nordvik companies produces 8 checkboxes per occurrence, each independently completed and stamped. An employee typically works through the same task for a portfolio of 5–10 companies.

- **Scope resolution:** the `scope` field (dimension values) selects the matching companies; empty scope = all active companies. When a new company is created (or its dimension values change) and it matches a task's scope, it is included in **future** instance generation; existing instances are untouched.
- Tasks are assigned to **either a team or a person** (never both, never neither). Assignment applies to the whole task — all its company instances land with the same team/person.
- A team task appears on the dashboard of **every member of that team**, marked with a chip, e.g. `Group – A/R`. Each company instance is completed for everyone as soon as any one member checks it off; different members can take different companies.
- A person task appears only on that person's dashboard.
- Admins can reassign tasks between people or teams; reassignment is logged in `task_events`.
- Archiving a company stops future instance generation for it; its historical instances and stamps remain.

## 6. Recurrence and deadlines

Recurrence lives on the task definition; a scheduler materializes `task_instances`.

**Recurrence options:**
- **One-off** — a single instance with an explicit due date.
- **Weekly** — pick weekday; instance due that weekday each week.
- **Monthly, fixed date** — pick day-of-month 1–31. If the month is shorter, clamp to the last day of the month.
- **Monthly, Nth working day** — pick N (e.g. "2nd working day"). Working day = Mon–Fri excluding rows in `holidays` for a per-task selected country (default Norway). Support negative N for "Nth-last working day" (e.g. −1 = last working day of the month) — this is a genuine differentiator for finance close checklists.

**Instance generation:** a scheduled function (Supabase cron / pg_cron, or an idempotent generate-on-demand routine run at app load) creates instances rolling ~60 days ahead — one row per `(task_id, company_id, due_date)` for every company matching the task's scope at generation time. Generation must be idempotent (upsert on that triple).

**Overdue:** an instance is overdue when `status = 'open'` and `due_date < today` in the **Europe/Oslo** timezone (make timezone a single config constant).

**Copy previous task:** when creating a task, admin can pick from a searchable list of existing/archived task definitions to prefill the form. **All fields carry over, including the assignee** (same person or team as last time), scope, recurrence and deadline rule — every field remains editable before saving. If the copied assignee is an archived member or team, the assignee field is cleared and flagged so the admin must pick a new one.

**Editing a recurring task** affects future instances only; past instances and their audit trail are untouched.

## 7. Pages

Sidebar navigation. Pages marked (admin) are hidden from members and protected server-side.

### 7.1 Dashboard (all users, default after login)

- Greeting: **"Hello {first name}! You have {x} tasks to complete today."** Today = instances due today.
- Period toggle: **Today / This week / This month** (due-date based).
- Scope toggle: **My tasks** (default) / **All tasks**. All-tasks view gets filters for team, assignee, and every dimension (Country, Brand, custom).
- Overdue banner when applicable: **"You have {x} overdue tasks"** — clicking it filters to overdue items. Overdue rows are visually distinct.
- **Rows are grouped by task occurrence**: a task row shows title, chips (Group – {team} for team tasks; scope chips like `Norway`, `Nordvik`), due date, and a progress indicator, e.g. **"5/8 companies"** with a matching progress bar. The row is green only when all its company instances are completed/N-A.
- Expanding a task row reveals the **per-company checklist** — one line per company instance, each with its own status and actions:
  - **Complete** → line turns green, stamped "{name}, {date} {time}".
  - **Mark N/A** → line turns grey, same stamp, optional reason captured in a small dialog.
  - **Reopen** (on completed/N/A lines) → back to open; the original stamp remains visible in history. All three are appended to `task_events` per instance.
- **Bulk action:** "Complete remaining" on the task row completes all open company instances at once, but writes an individual stamp and `task_events` row per instance — the audit trail is always per company. A confirm dialog lists the companies affected.
- The greeting and overdue counts count **company instances**, not task rows (completing 5 of 8 companies reduces the count by 5).

### 7.2 Tasks (admin)

- Table of task definitions with search and filters; create/edit dialog with: title, description, assignee (team or person picker), scope (dimension value multi-select), recurrence and deadline rule per §6, "copy from existing task" entry point.
- Reassign and archive actions. Archived tasks stop generating instances but keep history.

### 7.3 History (admin)

Audit-trail view of completed work — the evidence tab.

- Table of resolved task instances (status `completed` or `na`) with columns: task title, company, due date, status, who set it, when it was set, N/A reason.
- Filters: **company**, **task**, **month** (due-date month), plus status and assignee. Filters combine; default view is the current month.
- Each row expands to its full `task_events` timeline (created → completed → reopened → completed, with actor and timestamp per event) so a reopened-and-recompleted instance is fully traceable.
- Sortable by due date, company and completion timestamp.
- Admin-only. (A CSV export of the filtered view is Phase 2 — see §11.)

### 7.4 Companies (admin)

- CRUD for companies with per-dimension value selects.
- **Manage dimensions:** add a dimension (name + list of allowed values), edit values. When a new dimension is added and companies already exist, launch a guided flow prompting the admin to populate the new dimension for every existing company (a simple table with a select per row; allow "fill later", showing an incomplete-data warning until resolved).
- **CSV import:** downloadable CSV template generated from current dimensions (`name,country,brand,<custom dims…>`). On upload: validate every row, then show a preview with per-row errors (unknown dimension value, duplicate name, missing required field). Nothing is written until the admin confirms; valid rows import, failing rows are listed with reasons and downloadable as an errors CSV.

### 7.5 Teams & members (admin)

- CRUD for teams. Empty team → inline warning badge, not a blocker.
- CRUD for members: name, email, position, team (or explicit "No team"). Creating a member sends a Supabase invite email in real deployments; in demo mode members are just rows (see §9).
- Master admin only: promote/demote admin role.

### 7.6 Office calendar (view: all; edit: admin)

- Grid of members × days, viewable by **day / week / month**; member list auto-populates from non-archived profiles.
- The member column shows **name and team** (e.g. "Anna Berg — A/R"; members with no team show "No team").
- **Sort toggle: by team or by name**, persisted **per user** (store on the profile or in local storage keyed to the user) so a team leader who prefers team grouping keeps that view across sessions while others default to name. When sorted by team, teams render as collapsible section headers with members alphabetical inside.
- Cell statuses: In office, Remote, Out of office, Sick, Sick leave, Parental leave, Business travel — each with a distinct muted color and a legend.
- Admins click a cell (or drag across a range) to set status; members have read-only view.

## 8. Non-functional requirements

- TypeScript strict; no `any` in committed code.
- All date logic in one tested module (`lib/dates.ts`): working-day calculation, clamping, overdue determination. Unit-test it hard — including −N working days, months ending on weekends, and holidays.
- RLS policies tested (Supabase SQL tests or integration tests with two role clients).
- Responsive down to tablet width; dashboard usable on mobile.
- Accessible: keyboard-navigable dialogs, labeled controls, sufficient contrast on status colors.

## 9. Demo mode (portfolio-critical)

The public deploy must let a recruiter explore in under 30 seconds with zero signup:

- Landing page with two buttons: **"Explore as Admin"** and **"Explore as Member"** — each signs into a pre-provisioned demo account (fixed credentials via server action; do not display raw passwords).
- **Seed script** (`pnpm seed`, idempotent) creates: ~12 companies across Norway/Sweden/Denmark with two brands and a custom "Size" dimension; teams A/R, A/P, R2R 1, R2R 2; ~10 members; ~25 task definitions mixing weekly, fixed-date and working-day recurrences; instances spanning last month and next month with a realistic mix of completed/open/overdue/N/A (with per-company fan-out this will be a few hundred instances — that volume is intentional, it makes the dashboard look real); calendar entries for the current month.
- A nightly reset job (or reset button on the demo landing page, admin-only) restores seed state so the demo never rots.
- Banner in demo mode: "Demo environment — data resets nightly."

## 10. README requirements (part of the deliverable)

- One-paragraph pitch + link to the live demo.
- 3–5 screenshots (dashboard, task admin, CSV import preview, calendar).
- Architecture diagram (Mermaid is fine): Next.js ↔ Supabase (Auth, Postgres/RLS, cron).
- Feature list, data-model overview, local setup (`.env.example`, migrations, seed), test instructions, CI badge.
- Short "Design decisions" section (why single-checkbox tasks, why working-day deadlines, why soft delete) — this is what hiring managers actually read.

## 11. Explicitly out of scope (Phase 2 — list in README as roadmap)

- Email/Slack notifications and deadline reminders.
- Linking calendar absence to task reassignment suggestions.
- **Company portfolio ownership**: assigning specific companies to specific people (e.g. Anna owns NO595–NO599) so team-task instances auto-route to each company's owner instead of the whole team. In MVP, assignment stays at task level.
- CSV/Excel export of the History view's filtered results (the view itself is MVP — see §7.3).
- SSO / multi-tenant workspaces.

## 12. Bootstrapping

- First deploy: a `SEED_MASTER_ADMIN_EMAIL` env variable; on first login with that email, the profile is created with `master_admin` role. Everything else is configured in-app.

## 13. Suggested build order

1. Project scaffold, Supabase setup, auth, roles/RLS, profiles.
2. Companies + dimensions (CRUD, dimension backfill flow).
3. Teams & members.
4. Task definitions + `lib/dates.ts` recurrence engine with unit tests.
5. Instance generation + Dashboard (toggles, filters, complete/N-A/reopen, audit log, overdue banner).
6. CSV import with validation preview.
7. History / audit-trail page with filters.
8. Office calendar.
9. Demo mode, seed script, reset job.
10. Polish: responsive pass, accessibility pass, E2E smoke tests, README, CI, Vercel deploy.

Each step should end in a working, committed, deployable state.

## 14. Clarifications (post-1.0)

Resolved during implementation kickoff (2026-08-06):

- **Scope resolution is AND-across-dimensions, OR-within-dimension.** `scope = [Norway, Sweden, Nordvik]` matches companies that are (Norway OR Sweden) AND Nordvik. This is the only reading consistent with §4's one-value-per-company-per-dimension constraint — pure AND across raw values would make any multi-value-same-dimension scope match nothing.
- **`deadline_rule` is a nullable override, not a parallel spec.** For the large majority of tasks, the due date *is* the recurrence occurrence date (e.g. "25th of each month" is both when it recurs and when it's due). `deadline_rule` only needs to be set when the deadline differs from the occurrence date — e.g. an offset of N working/calendar days after generation. Leave it null and the instance's `due_date` equals the occurrence date.
- **All dimensions are required when creating a new company.** A company cannot be saved unless every currently-defined dimension has a value selected. The §7.4 "fill later" flow is narrower than it first reads: it applies only to the guided **backfill** prompted when an admin adds a *new* dimension after companies already exist — not to ordinary company creation, which is always fully validated.
