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
- [ ] 15. Add per-company checklist with complete/N-A/reopen and audit events — blocked by 14
- [ ] 16. Add bulk complete, overdue banner, and all-tasks filters — blocked by 15
- [ ] 17. Build CSV import for companies with validation preview
- [ ] 18. Build History audit-trail page with filters and event timelines — blocked by 15
- [ ] 19. Create calendar_entries schema and office calendar grid
- [ ] 20. Add calendar sort toggle and admin cell editing — blocked by 19
- [ ] 21. Write idempotent seed script with realistic demo data — blocked by 13, 19
- [ ] 22. Build demo mode landing page, banner, and reset job — blocked by 21
- [ ] 23. Run responsive and accessibility passes (also realigns the app shell/Companies/Teams UI to the stitch_office_task_pulse/ design template — see task 23 notes below) — blocked by 16, 18, 20
- [ ] 24. Add RLS policy tests and Playwright E2E smoke tests — blocked by 16
- [ ] 25. Set up GitHub Actions CI pipeline
- [ ] 26. Write README with screenshots, architecture diagram, and design decisions — blocked by 22
- [ ] 27. Deploy to Vercel with hosted Supabase project — blocked by 22

## Notes for picking this up in a new session

- Spec clarifications beyond v1.0 are in `taskdeck-spec.md` §14 (scope AND/OR semantics, deadline_rule as override, company-creation dimension validation).
- Frontend design reference: `stitch_office_task_pulse/` (mockups + `executive_precision/DESIGN.md` style guide). The app shell built in task 4 predates this and gets realigned to it in task 23.
- Local dev: Supabase runs on non-default ports (see `supabase/config.toml` — shifted +1000 to avoid colliding with other projects on this machine). Colima needs 4 CPU/6GB to run multiple local Supabase stacks at once.
- Every migration must `grant ... to authenticated, service_role` explicitly — this Supabase version doesn't auto-expose new tables to service_role either.
- Never wrap a server action in `startTransition` and pass it via a form's `action=` prop — use `onSubmit` + `preventDefault()` + `new FormData(e.currentTarget)` instead. See the task 11 commit for why.
