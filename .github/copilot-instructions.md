# Workspace Copilot Instructions

- [x] Verify that `copilot-instructions.md` exists in `.github/`.
- [x] Clarify project requirements (already fully specified by user request).
- [x] Scaffold project manually in the current directory using Next.js App Router + TypeScript + Tailwind structure.
- [x] Customize project with F1-styled UI, routes, schema, parser review workflow, and deterministic scoring logic.
- [ ] Install required extensions (none specified by setup tool output).
- [x] Compile project (run install/typecheck/build and fix errors if needed).
- [ ] Create and run VS Code task (not required for this MVP scaffold).
- [ ] Launch project in debug mode (pending explicit user confirmation).
- [x] Ensure documentation is complete (`README.md` + this file).

## Notes

- Implemented GP-by-GP punishment logic where loser is lowest combined score from exactly two teams.
- AI parser pipeline is mocked but API contract is production-ready.
- Supabase schema is normalized and supports auditability, snapshots, and correction logs.
