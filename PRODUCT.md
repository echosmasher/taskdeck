# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audience of the public demo (confirmed): hiring managers and engineers evaluating a portfolio project. They spend a couple of minutes in the demo and judge craft, product thinking, and polish. The product itself must also work for its intended users (confirmed as a secondary, equal-quality target): office and finance shared-service teams who run the same checklist across a portfolio of companies, clients, branches, or accounts every week or month.

Roles in the product: master admin, admin, member. Members mostly live on the Dashboard completing their own and their team's tasks; admins manage tasks, companies, dimensions, teams, requests, and settings.

## Product Purpose

TaskDeck is a recurring-task tracker for any office team that runs the same checklist across a portfolio of entities and needs to prove it happened: who completed which one, and when. It fans one task definition out into one independently stamped checkbox per company, understands working-day deadlines ("2nd working day", "last working day of the month"), and treats the audit trail, not the checkbox, as the actual product.

It grew out of a finance shared-service use case (bank reconciliations, VAT return reviews across a client portfolio). Success for the demo: a visitor understands the model within seconds and sees it executed with craft.

## Positioning

The unit of work is the occurrence per company, each independently completed, stamped, and logged, with coverage and reassignment handled as audited requests rather than direct writes. A generic task list or checklist app does not model this fan-out or the audit evidence it produces.

## Operating Context

- Recurring work: weekly, monthly-fixed-date, and monthly Nth (or Nth-last) working-day recurrence, with Norwegian, Swedish, and Danish holidays seeded for working-day math.
- One person typically works the same task across 5 to 10 companies.
- Team tasks appear on every team member's dashboard; any member can complete a company instance for everyone.
- Absence-aware assignment: long-term absence surfaces open instances on a Coverage page for bulk reassignment.
- Public demo mode: zero-signup "Explore as Admin" / "Explore as Member", a "data resets nightly" banner, nightly reseeded realistic data (about 12 companies, 25 tasks).

## Capabilities and Constraints

- Dashboard (Today / This week / This month; My tasks / All tasks; overdue banner; per-company checklist under each task with Complete / N/A / Reopen).
- Admin pages: Tasks, Companies (dimensions, CSV import with validated preview), Teams and Members, Coverage, Requests, History, Settings.
- Office calendar with day, week, and month views and configurable edit permissions.
- Reassignment is always a request that an admin approves or rejects, never a direct write. Access is enforced in Postgres RLS, not only in the UI.
- Stack is fixed: Next.js App Router (v16), TypeScript, Supabase (Postgres, Auth, RLS), Tailwind with shadcn/Base UI components, Vercel.
- Framing (confirmed): domain-agnostic in the product and its copy; finance appears only in the demo data. The current login tagline ("for finance shared-service teams") and hardcoded "companies" noun contradict this and are known inconsistencies.
- Name "TaskDeck" is fixed.
- Existing vocabulary to preserve unless the user says otherwise: Complete / N/A / Reopen, "Complete remaining", "Request reassignment", team chips such as "Group – A/R".
- Undecided: whether the "companies" noun should become configurable.

## Brand Commitments

Name: TaskDeck (fixed). No logo or brand assets beyond the wordmark are established. The current visual look originates from a Stitch-generated "Executive Precision" system (`stitch_office_task_pulse/`); the user wants a more distinctive result, so it is treated as the incumbent, not a binding reference.

## Evidence on Hand

- Live demo: https://taskdeck-mocha.vercel.app
- README with screenshots in `docs/screenshots/`.
- `taskdeck-spec.md`, `taskdeck-addendum-v1.1.md`, `tasks.md`.
- Unit, RLS, and Playwright e2e tests; CI badge.
- Absent: real customers, testimonials, usage metrics. Do not fabricate any.

## Product Principles

1. The audit trail is the product: every state change is attributable, stamped, and visible.
2. The occurrence per company is the unit of design, not the task card.
3. Completing work should take the fewest possible steps; secondary actions stay out of the way.
4. Honest about permissions: requests are requests, and the interface never implies a direct write where approval is required.
5. Legible in two minutes to a stranger, and efficient on day 200 for the person who lives in it.

## Accessibility & Inclusion

No product-specific standard established. Working target: WCAG AA, with status never conveyed by color alone and full keyboard operation of primary flows.
