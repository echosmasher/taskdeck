---
target: dashboard
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/mariterlien/Projects/archon/taskdeck/src/app/(app)/dashboard-view.tsx"
target_fingerprint: "sha256:5647741dfb0312b2110f8fa4a24573705ff96f194d2b82d573345b06679eb590"
target_path: /Users/mariterlien/Projects/archon/taskdeck/src/app/(app)/dashboard-view.tsx
timestamp: 2026-10-15T08-32-04Z
slug: src-app-app-dashboard-view-tsx
---
# Critique: dashboard (method: dual-agent, source-only; no live inspection)
Score 21/40 (Acceptable). Heuristics: 1=2 2=3 3=2 4=3 5=2 6=3 7=1 8=2 9=2 10=1.
Detector: 1x side-tab at dashboard-task-row.tsx:52 (true positive); globals.css clean.
Verdict: category-interchangeable shadcn default; domain concepts (occurrence, coverage, override) only appear as badge chips.
Priority issues:
- [P1] No loading.tsx/error.tsx under (app)/ -> /impeccable harden
- [P1] Row action density; Complete buried behind expand -> /impeccable distill
- [P1] Color-only status stripe, green-600 xs text fails AA, progress bar and overdue toggle lack ARIA -> /impeccable harden
- [P2] Generic header and identity -> /impeccable bolder, typeset
- [P2] Filter/scope IA, ISO dates, hardcoded "companies" -> /impeccable clarify
