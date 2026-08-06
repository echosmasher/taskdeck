# TaskDeck implementation tasks

Derived from `taskdeck-spec.md` (§13 suggested build order, expanded).
Workflow: commit after each finished task; ask before pushing to GitHub
(see spec for the "why" behind each task — this file just tracks status).

- [x] 1. Scaffold Next.js app with TypeScript strict, Tailwind, shadcn/ui
- [x] 2. Set up Supabase project, migrations workflow, and env config
- [x] 3. Create profiles/teams schema with roles and RLS policies
- [x] 4. Build auth flow, protected routes, and app shell with role-aware nav
- [x] 5. Create companies and dimensions schema with RLS
- [x] 6. Build Companies admin page with CRUD and dimension selects
- [x] 7. Add dimension management with guided backfill flow
- [x] 8. Build Teams & members admin page
- [x] 9. Build lib/dates.ts recurrence engine with holidays and unit tests
- [x] 10. Create tasks, task_instances, and task_events schema with RLS
- [x] 11. Build Tasks admin page with create/edit dialog
- [x] 12. Add copy-previous-task, reassign, and archive actions
- [x] 13. Implement idempotent instance generation with scope resolution
- [x] 14. Build Dashboard shell with greeting, toggles, and grouped task rows
- [x] 15. Add per-company checklist with complete/N-A/reopen and audit events
- [x] 16. Add bulk complete, overdue banner, and all-tasks filters
- [x] 17. Build CSV import for companies with validation preview
- [x] 18. Build History audit-trail page with filters and event timelines
- [x] 19. Create calendar_entries schema and office calendar grid
- [x] 20. Add calendar sort toggle and admin cell editing (built together with 19 — a grid without a working sort toggle or editing wasn't a meaningful checkpoint to stop at)
- [x] 20a. Create `app_settings` schema with RLS and admin Settings page
- [x] 20b. Implement three-mode calendar edit permissions in RLS and UI
- [x] 20c. Build `lib/absence.ts` classification helper with unit tests
- [x] 20d. Add `assignee_override_profile_id` to task_instances; effective-assignee resolution across dashboard, History and generation
- [ ] 20e. Add assignment-time absence warnings and the admin coverage view — blocked by 20c, 20d
- [ ] 20f. Create `reassignment_requests` schema with RLS and member request flow — blocked by 20d
- [ ] 20g. Build admin Requests page with approve/reject, badge, and audit events — blocked by 20f
- [ ] 21. Write idempotent seed script with realistic demo data, including the absence/override/request fixtures from addendum §15.5 — blocked by 13, 19, 20a–20g
- [ ] 22. Build demo mode landing page, banner, and reset job — blocked by 21
- [ ] 23. Run responsive and accessibility passes — also realigns the app shell/Companies/Teams UI to the stitch_office_task_pulse/ design template (see task 23 notes below), and now also covers the Settings, Requests, and coverage views — blocked by 16, 18, 20, 20a–20g
- [ ] 24. Add RLS policy tests and Playwright E2E smoke tests — including all three calendar edit-permission modes and members being unable to reassign directly, plus an E2E path for request → approve → override visible on the new assignee's dashboard — blocked by 16, 20b, 20d, 20g
- [ ] 25. Set up GitHub Actions CI pipeline
- [ ] 26. Write README with screenshots, architecture diagram, and design decisions — including why absence warns rather than blocks, and why coverage is modelled as an instance override — blocked by 22
- [ ] 27. Deploy to Vercel with hosted Supabase project — blocked by 22

## Notes for picking this up in a new session

- Spec clarifications beyond v1.0 are in `taskdeck-spec.md` §14 (scope AND/OR semantics, deadline_rule as override, company-creation dimension validation).
- `taskdeck-addendum-v1.1.md` (§15, not yet appended into the main spec file) covers app_settings, configurable calendar edit permissions, absence-aware assignment with instance-level overrides, and member-initiated reassignment requests — tasks 20a–20g. It also has knock-on changes to §6 (timezone becomes `app_settings.timezone` instead of the hardcoded `APP_TIMEZONE` constant in `lib/config.ts`), §7.3, §7.6, §9, and §11 — read it before starting 20a.
- Frontend design reference: `stitch_office_task_pulse/` (mockups + `executive_precision/DESIGN.md` style guide). The app shell built in task 4 predates this and gets realigned to it in task 23.
- Local dev: Supabase runs on non-default ports (see `supabase/config.toml` — shifted +1000 to avoid colliding with other projects on this machine). Colima needs 4 CPU/6GB to run multiple local Supabase stacks at once.
- Every migration must `grant ... to authenticated, service_role` explicitly — this Supabase version doesn't auto-expose new tables to service_role either.
- Never wrap a server action in `startTransition` and pass it via a form's `action=` prop — use `onSubmit` + `preventDefault()` + `new FormData(e.currentTarget)` instead. See the task 11 commit for why.
- The app shell's content column (`AppShell`'s `<div className="flex flex-1 flex-col">`) needed `min-w-0` added — without it, any page with intrinsically-wide content (e.g. the calendar's month view, ~30 columns) pushes the whole page wider instead of scrolling inside its own `overflow-x-auto` container. Keep that in mind for any other wide-content page (e.g. a future data table).
