# AGENTS.md — Multi-Tenant School ERP SaaS

## 1. Product Definition & Architecture
- **Type:** Production-grade internal Multi-Tenant School ERP SaaS (modular monolith; no microservices).
- **Hierarchy:** `PLATFORM -> ORGANIZATION/TENANT -> CAMPUS/BRANCH -> PERSON -> USER ACCOUNT -> ROLE -> PERMISSION -> ASSIGNMENT/SCOPE -> RESOURCE`.
- **Multi-Tenancy:** Single PostgreSQL database, shared schema, `organization_id` on tenant-owned entities, `campus_id` on campus-owned entities, centralized server authorization, and PostgreSQL Row-Level Security (RLS) as defense-in-depth.
- **Identity Model:** Never model `User = Teacher`. Always separate `PERSON -> USER ACCOUNT -> ROLES -> ASSIGNMENTS` so one person can hold multiple roles (e.g., Teacher + Parent).

## 2. Technology Stack ($0 MVP Compatible)
- **Frontend:** Next.js (App Router) + React + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Next.js Server Actions / API Route Handlers
- **Database & ORM:** PostgreSQL (Supabase) + Prisma
- **Validation:** Zod (strict validation on all inputs)
- **Storage:** Private S3-compatible object storage (Supabase Storage / Cloudflare R2) with signed URLs only
- **Queue / Cache:** Redis / Valkey (Upstash Redis for $0 tier)
- **WhatsApp MVP:** Pre-filled `wa.me` share links with secure receipt URLs (no paid WhatsApp Business API)
- **Deployment / CI:** GitHub, GitHub Actions, Vercel, Cloudflare

## 3. Required Project Folder Structure

    school-erp/
    ├── app/
    │   ├── (auth)/
    │   ├── (dashboard)/
    │   └── api/
    ├── components/
    │   ├── ui/
    │   ├── layout/
    │   └── shared/
    ├── features/
    │   ├── organizations/
    │   ├── campuses/
    │   ├── users/
    │   ├── roles/
    │   ├── students/
    │   ├── academics/
    │   ├── attendance/
    │   ├── fees/
    │   ├── accounting/
    │   ├── examinations/
    │   ├── hr/
    │   ├── payroll/
    │   └── notifications/
    ├── server/
    │   ├── auth/
    │   ├── authorization/
    │   ├── services/
    │   ├── repositories/
    │   └── jobs/
    ├── lib/
    │   ├── db/
    │   ├── validation/
    │   ├── security/
    │   ├── logging/
    │   └── utils/
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── seed.ts
    ├── tests/
    │   ├── unit/
    │   ├── integration/
    │   ├── api/
    │   └── e2e/
    ├── docs/
    ├── public/
    ├── docker/
    ├── .env.example
    ├── Dockerfile
    └── package.json

## 4. Mandatory Request & Authorization Pipeline
Every protected API route and server action must execute in this exact order:
`Request -> Authentication -> Session Validation -> Tenant Resolution -> User Resolution -> Role & Permission Check -> Scope Check (Org/Campus/Class/Section/Subject) -> Resource Ownership Check -> Zod Validation -> Business Service -> Database (with Transaction if financial) -> Audit Log -> Response`.

- **Error Codes:** Return consistent JSON errors (`400`, `401`, `403`, `404`, `409`, `429`, `500`). Never expose raw database or Prisma errors.
- **Audit Logging:** Log who, what, when, organization, campus, resource, old value, new value, IP, and User-Agent for sensitive operations. Never log passwords, tokens, or secrets.

## 5. The 20 Non-Negotiable Rules
1. Never trust client-side authorization.
2. Never trust browser-supplied tenant IDs (`organization_id`).
3. Never trust browser-supplied campus IDs (`campus_id`).
4. Never store plaintext passwords.
5. Never commit secrets.
6. Never expose private files publicly.
7. Never mix production and development databases.
8. Never allow cross-tenant access.
9. Never allow unauthorized cross-campus access.
10. Never treat hidden UI elements as security.
11. Never perform multi-step financial operations without database transactions (`BEGIN ... COMMIT / ROLLBACK`).
12. Never casually delete financial history (use refund, reversal, void, or correction workflows).
13. Never build all modules at once.
14. Never skip security tests.
15. Never hardcode tenant names or IDs.
16. Never hardcode campus IDs.
17. Never hardcode permissions into business data.
18. Never introduce unnecessary microservices.
19. Never fork the codebase for ordinary tenant customization (use database configuration).
20. Never declare a module complete without backend, database, authorization, and testing.

## 6. Definition of Done (Per Module)
A module is NOT complete until all layers are implemented and verified:
Database (Schema + Indexes + Constraints) -> Backend Service -> Authorization -> Zod Validation -> Business Logic -> API -> Frontend UI -> Unit/API/Negative Security Tests -> Audit Logging -> Documentation.

## 7. Master Development Workflow (Phase Gate System)
For every task, follow this exact loop:
1. Read `AGENTS.md` and `TASKS.md`.
2. Inspect the current repository state.
3. Implement **ONLY** the currently approved phase. Never silently jump to later phases.
4. Run build (`npm run build`), type-check (`npx tsc --noEmit`), Prisma validation (`npx prisma validate`), and automated tests.
5. Check off completed items in `TASKS.md`.
6. Document changes, report test/security results, and **STOP** for explicit user approval before starting the next phase.