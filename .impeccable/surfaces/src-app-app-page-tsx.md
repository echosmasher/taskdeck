---
version: 1
slug: "src-app-app-page-tsx"
primary_target: "src/app/(app)/page.tsx"
related_targets: ["src/app/(app)/dashboard-view.tsx","src/app/(app)/layout.tsx","src/app/login/page.tsx"]
---

# Surface brief: Dashboard and shell

Mode: Operate. Scope: member dashboard (`src/app/(app)/page.tsx` and its components), the app shell (sidebar, top bar), and the login/demo landing page. Admin pages inherit tokens only and are restyled later.

Audience and job: a member works their tasks company by company each day; a hiring manager or engineer must grasp the fan-out (one task, one stamped cell per company) in about ten seconds. Real finance teams are the equal-quality secondary audience.

Task: complete a company's cell in the fewest steps; every cell shows who stamped it and when. Behavior and vocabulary are unchanged (Complete / N/A / Reopen, Complete remaining, Request reassignment, team chips).

Unresolved: whether "companies" becomes a configurable noun (kept hardcoded for now, flagged). "Today" scope definition is decided in the build and stated on the page.

## Direction contract

THESIS: Completion shown the way auditors already mark it: a tickmark, initials and a date in every company cell. Refuses the generic card list with a progress bar and the red-everything overdue treatment.

OWN-WORLD: Audit workpaper conventions. Cool grey ground #F3F5F4, ink #1D2420, pencil-green tick #1E7F5C (text-safe variant for AA), review red #C2362B, index blue #34509A, hairlines #CBD2CF. Hanken Grotesk for UI, JetBrains Mono for refs, initials and dates. State is carried by form not hue: stamped tick with initials/date, circled n/a, dashed open box, doubled rule for overdue. A tickmark legend closes the table.

STORY: A visitor sees a workpaper where each task row has a reference (A/1, A/2), a cell per company, and a Reviewed sign-off, and understands the audit model without a tour. They believe it is an audit-grade tool and can complete a cell in one action.

FIRST VIEWPORT: Desktop: 232px white sidebar with wordmark and nav; top bar with user and Sign out; heading, a state summary ("5 due today · 17 overdue · 12 this week", overdue as an aria-pressed filter), scope and period tabs; below, the workpaper table with sortable headers (Ref, Task, six company columns, Reviewed), one primary action per row and the legend at the foot. Mobile: task-first cards with company cells listed vertically, 44px targets.

FORM: Audit Workpaper, IMPECCABLE'S PICK (user-chosen), seed key b967e2ae. Default view: grid on desktop, task-first rows on mobile, with a view toggle.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
