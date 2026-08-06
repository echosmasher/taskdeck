# TaskDeck spec addendum v1.1

> Append to `taskdeck-spec.md` as **§15**. Covers configurable settings, calendar edit permissions, absence-aware task assignment, and member-initiated reassignment requests.
> These changes sequence **before task 21 (seed script)** in `tasks.md`, because seed data, the accessibility pass, E2E tests and the README all need to cover them.

---

## 15.1 Application settings

New table **app_settings** — a singleton row (`id` fixed, enforced with a CHECK constraint so only one row can exist). Editable by admins only; readable by all authenticated users.

| Setting | Type | Default | Purpose |
|---|---|---|---|
| `calendar_edit_permission` | enum: `admins_only` \| `members_own` \| `members_all` | `members_own` | Who may edit office-calendar entries (§15.2) |
| `long_absence_statuses` | text[] | `['sick_leave','parental_leave']` | Statuses always treated as long-term absence (§15.3) |
| `long_absence_min_days` | int | `5` | Consecutive-day threshold at which `out_of_office` counts as long-term (§15.3) |
| `timezone` | text | `Europe/Oslo` | Replaces the hardcoded timezone constant from §6 |

Surface these on a **Settings** page (admin-only, sidebar item below Teams & members), with inline help text explaining each option's effect. All settings changes are written to `task_events`-style audit rows or a small `settings_events` log — a portfolio repo benefits from showing that configuration changes are auditable too.

## 15.2 Office calendar edit permissions

Replaces the flat "edit: admin" rule in §7.6.

- **`admins_only`** — current behaviour; members have read-only access.
- **`members_own`** (default) — a member may create, edit and delete calendar entries **for their own row only**; admins may edit any row. This is the recommended default: it gives the time-saving of self-service without letting someone mark a colleague as on sick leave.
- **`members_all`** — any member may edit any row; suits small, high-trust teams.

Requirements:

- Enforce in **RLS policies**, not just the UI: the policy on `calendar_entries` reads the current setting and the acting user's `profile_id`. Write policy tests for all three modes (§ task 24).
- The UI reflects the mode: non-editable cells are visually inert and not keyboard-focusable; the calendar shows a small note explaining who may edit ("You can update your own days").
- Every calendar entry stores `set_by_profile_id` and `set_at`, so a member-set entry is distinguishable from an admin-set one. Show this in the cell tooltip.
- Changing the setting never rewrites existing entries.

## 15.3 Absence-aware task assignment

**Decision: absence never blocks assignment.** Assignment lives on the task definition and is indefinite; absence lives on calendar days and is time-bounded. A hard validation rule couples the two and fails exactly when it matters most — a member calling in sick with open instances due that day. Instead: warn at assignment time, and provide per-occurrence coverage.

### 15.3.1 Absence classification

A helper (`lib/absence.ts`, unit-tested alongside `lib/dates.ts`) classifies a member's absence on a given date as:

- **long-term** — the day's status is in `long_absence_statuses`, **or** the day is part of a run of `out_of_office` days of length ≥ `long_absence_min_days` (default 5). Runs are counted over consecutive calendar days, ignoring weekends and holidays when determining continuity.
- **short-term** — any other non-present status (`out_of_office` runs below the threshold, single-day `sick`, `business_travel`).
- **present** — `in_office`, `remote`, or no entry.

`remote` is explicitly **not** an absence.

### 15.3.2 Assignment-time warnings (non-blocking)

When an admin creates, edits, copies or reassigns a task to a person, check that person's calendar against the task's next ~60 days of due dates:

- **Long-term overlap** → prominent warning: "Anna Berg is on parental leave from 12 Aug to 3 Nov. 6 occurrences (48 company instances) fall in this period." Offer two inline actions: *Assign anyway* or *Assign and cover* (opens the override flow in §15.3.3 pre-filled with the affected instances).
- **Short-term overlap** → quiet informational note only; no action required.
- Never disable the save button. Admins can always proceed; the warning is recorded in `task_events` details so the decision is traceable.

Team assignments are not warned on — a team task is completable by any member, so absence self-heals.

### 15.3.3 Instance-level assignee override

New nullable column on **task_instances**: `assignee_override_profile_id` (FK profiles) plus `override_reason` and `override_set_by` / `override_set_at`.

- The **effective assignee** of an instance is `assignee_override_profile_id` when set, otherwise the task definition's assignee (or the assigned team). Every dashboard, History and coverage query uses effective assignee, not the raw task assignee.
- Overrides apply to a specific `(task_id, company_id, due_date)` instance, so an admin can cover one month, or a subset of companies, without changing the recurring task. When the absence ends, future instances revert automatically — no cleanup, no lost history.
- Setting or clearing an override writes a `task_events` row (`event: 'override_set' | 'override_cleared'`).
- An overridden instance shows a chip on the dashboard, e.g. `Covering for Anna`, on the covering member's view, and `Covered by Jonas` in the History and admin views.
- Instance generation never copies overrides forward.

### 15.3.4 Coverage view (admin)

A filter/tab on the Tasks admin page (or a section of the Dashboard's all-tasks view): **open instances whose effective assignee is classified long-term absent on the due date**. Columns: task, company, due date, assignee, absence status and expected return date. Bulk action: assign an override to another member for the selected instances.

This is where absence gaps surface — per occurrence, where they are actionable — rather than in a form validator.

## 15.4 Member-initiated reassignment requests

Members may **request** reassignment; only admins may execute it. Members can never reassign a task to themselves or anyone else directly.

New table **reassignment_requests**:

`id`, `requested_by_profile_id`, `scope ('instance' | 'task')`, `task_id`, `task_instance_ids (uuid[] — for instance scope; may cover several companies of the same occurrence)`, `reason (text, required)`, `suggested_assignee_profile_id (nullable — a suggestion only)`, `status ('pending' | 'approved' | 'rejected' | 'withdrawn')`, `decided_by_profile_id`, `decided_at`, `decision_note`, `created_at`.

### 15.4.1 Member flow

- From any task row or per-company line on the Dashboard: **Request reassignment**. A dialog captures scope and reason:
  - **This occurrence** — the current due date, with checkboxes to pick which company instances (defaults to all of that occurrence's instances assigned to them).
  - **The whole task** — all future occurrences.
- A member may optionally suggest an assignee; the field is clearly labelled as a suggestion.
- Pending requests show as a chip on the affected rows (`Reassignment requested`). The member can **withdraw** a pending request.
- Members see their own requests and decisions in a small "My requests" panel on the Dashboard.

### 15.4.2 Admin flow

- **Requests** page (admin-only sidebar item) with a count badge for pending requests; also surfaced in the admin's Dashboard as a banner ("3 reassignment requests awaiting your decision").
- Each request shows requester, scope, reason, affected task/companies/dates, the suggested assignee if any, and the current assignee's absence status if relevant.
- **Approve** requires the admin to select the new assignee (defaulting to the suggestion if given, but always confirmed explicitly). On approval:
  - instance scope → writes `assignee_override_profile_id` on the listed instances;
  - task scope → updates the task definition's assignee (existing reassign action from task 12), leaving past instances untouched.
- **Reject** requires a short decision note.
- Every decision writes a `task_events` row and is visible in the History timeline (§7.3), so the audit trail shows *why* an assignee changed, not just that it did.
- Approving a request never bypasses the absence warning in §15.3.2 — if the newly selected assignee is long-term absent, the same warning appears.

### 15.4.3 Notifications

Out of scope for MVP (consistent with §11): no email. Pending-request awareness is carried by the nav badge and dashboard banner. Add "email notification of pending requests and decisions" to the Phase 2 roadmap.

## 15.5 Knock-on updates to existing sections

- **§6 Recurrence** — the timezone constant is now read from `app_settings.timezone`.
- **§7.3 History** — add filters for override status and reassignment decisions; timelines include `override_set`, `override_cleared`, and reassignment approve/reject events.
- **§7.6 Office calendar** — edit permission governed by §15.2; cells show `set_by` in the tooltip.
- **§9 Demo mode / seed** — seed must include: a member on parental leave with an active instance override covering their tasks, a member with a 7-day vacation run, a member with a 2-day absence (short-term, no coverage), one pending reassignment request, one approved and one rejected request, and non-default settings on at least one field so the Settings page is not empty. Both demo accounts should land on something interesting.
- **§11 Phase 2** — add: email notification of reassignment requests/decisions; auto-suggesting a cover assignee based on team workload; calendar entry approval workflow.

## 15.6 Proposed task list additions

Insert before task 21 in `tasks.md`:

- [ ] 20a. Create `app_settings` schema with RLS and admin Settings page — blocked by 4
- [ ] 20b. Implement three-mode calendar edit permissions in RLS and UI — blocked by 20a, 19
- [ ] 20c. Build `lib/absence.ts` classification helper with unit tests — blocked by 20a, 19
- [ ] 20d. Add `assignee_override_profile_id` to task_instances; effective-assignee resolution across dashboard, History and generation — blocked by 15, 18
- [ ] 20e. Add assignment-time absence warnings and the admin coverage view — blocked by 20c, 20d
- [ ] 20f. Create `reassignment_requests` schema with RLS and member request flow — blocked by 20d
- [ ] 20g. Build admin Requests page with approve/reject, badge, and audit events — blocked by 20f

Then update the existing tasks:

- **21 (seed)** — extend with the absence, override and request fixtures in §15.5.
- **23 (responsive/a11y)** — now also covers Settings, Requests and coverage views.
- **24 (tests)** — add RLS tests for all three calendar permission modes and for members being unable to reassign directly; add an E2E path covering request → approve → override visible on the new assignee's dashboard.
- **26 (README)** — add a design-decisions entry on why absence warns rather than blocks, and why coverage is modelled as an instance override.
