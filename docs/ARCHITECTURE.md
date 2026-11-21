# Multi-Tenant School ERP — Architecture Overview

## 1. System Topology & Identity Model
- Modular Monolith on Next.js App Router + TypeScript + PostgreSQL (Supabase) + Prisma.
- Hierarchy:
  `PLATFORM -> ORGANIZATION/TENANT -> CAMPUS/BRANCH -> PERSON -> USER ACCOUNT -> ROLE -> PERMISSION -> ASSIGNMENT/SCOPE -> RESOURCE`
- One person can hold multiple roles across campuses/departments without duplicated account identities.

## 2. Multi-Tenancy Isolation
- Defense-in-depth:
  1. Centralized server-side request pipeline (tenant & campus resolution strictly from session/assignments).
  2. PostgreSQL Row-Level Security (RLS) policies.
  3. No browser-supplied `organization_id` or `campus_id` is ever trusted.

## 3. Request Pipeline
`Request -> Authentication -> Session Validation -> Tenant Resolution -> User Resolution -> Role & Permission Check -> Scope Check -> Resource Ownership Check -> Zod Validation -> Business Service -> Database (Transaction) -> Audit Log -> Response`

## 4. Error Sanitization
All API errors return consistent JSON shapes (`400`, `401`, `403`, `404`, `409`, `429`, `500`). Raw database and Prisma errors are intercepted and sanitized before returning to the client.
