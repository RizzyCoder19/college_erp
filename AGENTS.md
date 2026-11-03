<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Permanent CampusOS Documentation Maintenance Rule

This is a standing project requirement for all engineering and agent tasks:

Whenever implementation work changes CampusOS functionality, architecture, database schema, permissions, workflows, security, integrations, UI behaviour, testing, deployment readiness, or operational assumptions, update the relevant existing documentation as part of that same work. Do not wait for explicit user requests to synchronize documentation.

### Primary Living Documents
- `docs/campusos_real_erp_blueprint_and_roadmap.md`
- `CAMPUSOS_PRODUCT_AUDIT.md`
- `docs/PHASE_2A4_SELF_SERVICE_PORTALS_BLUEPRINT.md`
- `docs/MILESTONE_2A4_STAGE_2_IMPLEMENTATION_REPORT.md`
- `docs/PRODUCTION_READINESS_AND_DATABASE_MIGRATION_PLAN.md`
- `docs/MILESTONE_2A4_STAGE_1_IMPLEMENTATION_REPORT.md`
- `docs/MILESTONE_2A3_IMPLEMENTATION_REPORT.md`
- `docs/conversation-indexes/`

### Core Documentation Rules
1. **Synchronize with Implementation:** Update affected canonical documents within the same milestone/commit.
2. **Cross-Document Consistency:** Avoid contradictory counts, statuses, architecture descriptions, and dates across documents.
3. **Historical Integrity:** Never rewrite historical reports to pretend later work existed earlier; record subsequent modifications as dated addenda or updates.
4. **Evidence Grounding:** Clearly distinguish verified test results, assumptions, and planned work; never invent test results, records, institutional policies, or approvals.
5. **No Sprawl & No Dumps:** Prefer updating existing canonical documents rather than spawning redundant files; do not dump full document contents into handovers.

