# TASKS.md — School ERP MVP Roadmap (Phases 0–5)

> **Rule:** Complete one phase at a time. Run build, lint, type-check, and security tests at the end of every phase. Update checkboxes `[x]` and **STOP** for user approval before moving on.

---

## Phase 0: Architecture & Project Scaffolding
- [x] Initialize Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui project.
- [x] Create the exact folder layout from `AGENTS.md` (`app/`, `components/`, `features/`, `server/`, `lib/`, `prisma/`, `tests/`, `docs/`, `docker/`).
- [x] Configure Prisma with PostgreSQL (`DATABASE_URL`, `DIRECT_DATABASE_URL`) and create `.env.example` (no real secrets).
- [x] Configure Vitest/Jest for unit, integration, and API testing + ESLint + TypeScript strict mode.
- [x] Create base API response/error handler (`400`, `401`, `403`, `404`, `409`, `429`, `500`) that strips raw DB errors.
- [x] Add `/api/health` health-check endpoint and structured logger (`lib/logging/`).
- [x] **Phase 0 Gate:** `npm run build` and `npx tsc --noEmit` pass with 0 errors. STOP for approval.

---

## Phase 1: Foundation (Database Schema, Multi-Tenancy, RBAC & Audit)
- [x] Define Prisma models with foreign keys, composite unique constraints, `created_at`/`updated_at`, soft-delete (`deleted_at`), and required indexes:
  - [x] `organizations`, `organization_settings`
  - [x] `campuses`, `campus_settings`
  - [x] `people`, `users`, `sessions`
  - [x] `roles`, `permissions`, `role_permissions`, `user_roles`
  - [x] `assignments` (supporting scopes: Organization, Campus, Department, Class, Section, Subject)
  - [x] `audit_logs`, `files`, `file_access_logs`
- [x] Write `prisma/seed.ts` to seed:
  - [x] Default roles (`Platform Super Admin`, `Organization Admin`, `Principal`, `Vice Principal`, `Teacher`, `Accountant`, `HR Manager`, `Receptionist`, `Staff`, `Parent`, `Student`).
  - [x] Granular permissions (`organizations.*`, `campuses.*`, `users.*`, `roles.*`, `students.*`, `fees.*`, `attendance.*`, `marks.*`, `payroll.*`, `accounting.*`, `audit_logs.view`).
  - [x] Two sample organizations with multiple campuses for multi-tenant isolation testing.
- [x] Implement centralized `AuditService` (`server/services/audit.service.ts`).
- [x] Add PostgreSQL RLS policy migration scripts as defense-in-depth and verify Prisma transaction context handling.
- [x] Build Foundation CRUD APIs & basic Admin UI for Organizations, Campuses, Roles, and Tenant Branding/Settings.
- [x] **Phase 1 Gate:** `npx prisma validate`, migrations, seed script, and build succeed. STOP for approval.

---

## Phase 2: Authentication + Authorization Engine
- [x] Implement secure password hashing (Argon2 or bcrypt) and HTTP-only secure session cookies (`server/auth/`).
- [x] Build `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` endpoints + Login UI (`app/(auth)/login`).
- [x] Implement centralized Authorization Middleware (`server/authorization/`):
  - [x] Validate session & active (non-disabled) user status.
  - [x] Resolve `organization_id` and `campus_id` strictly from server session/assignments (ignore client-supplied IDs).
  - [x] Evaluate Role -> Permission -> Scope -> Resource Ownership.
- [x] Build role-aware Dashboard shell (`app/(dashboard)/`) with dynamic navigation (remembering UI hiding is UX only).
- [x] Implement **Mandatory Negative Security Tests** (`tests/api/security.test.ts`):
  - [x] Tenant A -> Tenant B = `403 DENY`
  - [x] Campus A -> Campus B = `403 DENY`
  - [x] Teacher -> Unassigned Class = `403 DENY`
  - [x] Parent -> Another Family's Student = `403 DENY`
  - [x] Accountant -> Restricted HR Data = `403 DENY`
  - [x] Normal User -> Organization Admin Route = `403 DENY`
  - [x] Expired Session = `401 DENY`
  - [x] Disabled User = `403 DENY`
  - [x] Tampered `organization_id` / `campus_id` in request body/query = `403 DENY`
- [x] **Phase 2 Gate:** All negative security tests pass 100%. STOP for approval.

---

## Phase 3: People, Families, Students & Staff
- [x] Add Prisma models & migrations:
  - [x] `families`, `family_members`, `parents`, `students`, `student_guardians`
  - [x] `staff`, `teachers`
  - [x] `admission_inquiries`, `admission_followups`, `admission_documents`, `admissions`
- [x] Implement transactional User Creation service (creates `Person` + `User` + `Role` + `Assignment` + `AuditLog` in one transaction).
- [x] Build Student & Family Management APIs (`/api/students/*`, `/api/users/*`) supporting multiple children under one family/parent account.
- [x] Build Staff & Teacher Management APIs with campus-scoped assignments.
- [x] Implement Private File Upload service (MIME check, size check, safe object key, private bucket, authorized signed URLs only).
- [x] Build Dashboard UI pages for Admissions, Student Directory/Profile, Family Linking, and Staff/Teachers.
- [x] Write unit & API tests verifying cross-campus and cross-tenant isolation on student/staff records.
- [x] **Phase 3 Gate:** All tests, audit logs, and build pass. STOP for approval.

---

## Phase 4: Academic Core & Daily Attendance
- [ ] Add Prisma models & migrations:
  - [ ] `academic_years`, `terms`, `classes`, `sections`, `subjects`, `class_subjects`
  - [ ] `teacher_assignments` (Class + Section + Subject + Teacher)
  - [ ] `student_enrollments` (historical per-year enrollment without duplicating student records)
  - [ ] `timetables`, `timetable_entries`
  - [ ] `attendance_sessions`, `attendance_records` (`PRESENT`, `ABSENT`, `LATE`, `LEAVE`), `leave_requests`
- [ ] Build Academic Setup APIs & UI (Academic Years, Classes, Sections, Subjects, Teacher Assignments, Student Enrollments).
- [ ] Build Attendance Marking API (`/api/attendance/*`) & Teacher UI (strictly scoped to assigned Class/Section).
- [ ] Emit an `ATTENDANCE_ABSENT` event when a student is marked absent (hook ready for WhatsApp/notification queue).
- [ ] Build Parent Portal views (scoped strictly via `family_members` / `student_guardians`) for viewing own children's attendance.
- [ ] Write tests verifying Teacher cannot mark/view attendance for unassigned classes and Parent cannot view other students.
- [ ] **Phase 4 Gate:** All tests and build pass. STOP for approval.

---

## Phase 5: Fee Engine, Challans, Receipts, WhatsApp Share & Basic Reports (MVP Complete)
- [ ] Add Prisma models & migrations:
  - [ ] `fee_heads`, `fee_structures`, `fee_structure_items`, `student_fee_assignments`
  - [ ] `fee_invoices`, `fee_invoice_items`
  - [ ] `discounts`, `scholarships`, `arrears`, `late_fees`
  - [ ] `payments`, `payment_allocations`, `receipts`, `refunds`
- [ ] Build Fee Calculation engine (`server/services/fee.service.ts`) supporting tuition/transport/other heads, sibling discounts, concessions, arrears, late fees, and partial payments.
- [ ] Build Bulk Challan / Invoice Generator API & Printable Challan layout (using tenant branding config).
- [ ] Implement **Atomic Payment Transaction** (`BEGIN -> Payment -> Payment Allocation -> Receipt -> AuditLog -> COMMIT`, full `ROLLBACK` on error).
- [ ] Implement Refund/Void/Reversal workflow (strictly forbid hard-deleting financial records).
- [ ] Build **WhatsApp MVP Share Flow**: generate secure receipt link + pre-filled `wa.me` share button for Accountants/Receptionists.
- [ ] Build Basic MVP Reports (Daily Fee Collection, Outstanding Balances/Defaulters, Monthly Attendance Summary) with pagination and filters.
- [ ] Build Accountant Dashboard UI + Parent Portal Fees/Receipts view.
- [ ] Write unit tests for fee/discount/late-fee math, transaction rollback tests, and negative security tests for financial routes.
- [ ] **Phase 5 Gate (MVP Sign-Off):** Full test suite passes, security review passes, and production build deploys cleanly to Vercel + Supabase.