-- ==============================================================================
-- PostgreSQL Row-Level Security (RLS) Policies — Defense-in-Depth
-- ==============================================================================
-- This script configures RLS on all tenant-owned entities.
-- The application sets session context variables inside database transactions:
--   SET LOCAL app.current_organization_id = '<uuid>';
--   SET LOCAL app.current_campus_id = '<uuid>';
--   SET LOCAL app.bypass_rls = 'on'; -- Super-admin / maintenance only
-- ==============================================================================

-- Helper function to check if RLS bypass is requested
CREATE OR REPLACE FUNCTION app.is_rls_bypassed() RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(current_setting('app.bypass_rls', true), 'off') = 'on';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Enable RLS on Tenant-Owned Entities
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_access_logs ENABLE ROW LEVEL SECURITY;

-- 2. Organization Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_organizations ON organizations;
CREATE POLICY tenant_isolation_organizations ON organizations
  FOR ALL
  USING (
    app.is_rls_bypassed() OR
    id::text = current_setting('app.current_organization_id', true)
  );

-- 3. Campuses Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_campuses ON campuses;
CREATE POLICY tenant_isolation_campuses ON campuses
  FOR ALL
  USING (
    app.is_rls_bypassed() OR
    organization_id::text = current_setting('app.current_organization_id', true)
  );

-- 4. People Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_people ON people;
CREATE POLICY tenant_isolation_people ON people
  FOR ALL
  USING (
    app.is_rls_bypassed() OR
    organization_id::text = current_setting('app.current_organization_id', true)
  );

-- 5. Users Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_users ON users;
CREATE POLICY tenant_isolation_users ON users
  FOR ALL
  USING (
    app.is_rls_bypassed() OR
    organization_id::text = current_setting('app.current_organization_id', true)
  );

-- 6. Roles Isolation Policy (Permit system roles with NULL org_id, or tenant-owned roles)
DROP POLICY IF EXISTS tenant_isolation_roles ON roles;
CREATE POLICY tenant_isolation_roles ON roles
  FOR ALL
  USING (
    app.is_rls_bypassed() OR
    organization_id IS NULL OR
    organization_id::text = current_setting('app.current_organization_id', true)
  );

-- 7. Assignments Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_assignments ON assignments;
CREATE POLICY tenant_isolation_assignments ON assignments
  FOR ALL
  USING (
    app.is_rls_bypassed() OR
    organization_id::text = current_setting('app.current_organization_id', true)
  );

-- 8. Audit Logs Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  FOR ALL
  USING (
    app.is_rls_bypassed() OR
    organization_id::text = current_setting('app.current_organization_id', true)
  );

-- 9. Files Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_files ON files;
CREATE POLICY tenant_isolation_files ON files
  FOR ALL
  USING (
    app.is_rls_bypassed() OR
    organization_id::text = current_setting('app.current_organization_id', true)
  );

-- ==============================================================================
-- PHASE 3: RLS FOR FAMILIES, STUDENTS, STAFF & ADMISSIONS
-- ==============================================================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_documents ENABLE ROW LEVEL SECURITY;

-- Families
DROP POLICY IF EXISTS tenant_isolation_families ON families;
CREATE POLICY tenant_isolation_families ON families
  FOR ALL USING (app.is_rls_bypassed() OR organization_id::text = current_setting('app.current_organization_id', true));

-- Family Members
DROP POLICY IF EXISTS tenant_isolation_family_members ON family_members;
CREATE POLICY tenant_isolation_family_members ON family_members
  FOR ALL USING (app.is_rls_bypassed() OR organization_id::text = current_setting('app.current_organization_id', true));

-- Parents
DROP POLICY IF EXISTS tenant_isolation_parents ON parents;
CREATE POLICY tenant_isolation_parents ON parents
  FOR ALL USING (app.is_rls_bypassed() OR organization_id::text = current_setting('app.current_organization_id', true));

-- Students (Multi-Tenant + Campus defense-in-depth)
DROP POLICY IF EXISTS tenant_isolation_students ON students;
CREATE POLICY tenant_isolation_students ON students
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Student Guardians
DROP POLICY IF EXISTS tenant_isolation_student_guardians ON student_guardians;
CREATE POLICY tenant_isolation_student_guardians ON student_guardians
  FOR ALL USING (app.is_rls_bypassed() OR organization_id::text = current_setting('app.current_organization_id', true));

-- Staff (Multi-Tenant + Campus defense-in-depth)
DROP POLICY IF EXISTS tenant_isolation_staff ON staff;
CREATE POLICY tenant_isolation_staff ON staff
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Teachers
DROP POLICY IF EXISTS tenant_isolation_teachers ON teachers;
CREATE POLICY tenant_isolation_teachers ON teachers
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Admission Inquiries
DROP POLICY IF EXISTS tenant_isolation_admission_inquiries ON admission_inquiries;
CREATE POLICY tenant_isolation_admission_inquiries ON admission_inquiries
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Admissions
DROP POLICY IF EXISTS tenant_isolation_admissions ON admissions;
CREATE POLICY tenant_isolation_admissions ON admissions
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- ==============================================================================
-- PHASE 4: RLS FOR ACADEMIC CORE & DAILY ATTENDANCE
-- ==============================================================================

ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Academic Years
DROP POLICY IF EXISTS tenant_isolation_academic_years ON academic_years;
CREATE POLICY tenant_isolation_academic_years ON academic_years
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Classes
DROP POLICY IF EXISTS tenant_isolation_classes ON classes;
CREATE POLICY tenant_isolation_classes ON classes
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Sections
DROP POLICY IF EXISTS tenant_isolation_sections ON sections;
CREATE POLICY tenant_isolation_sections ON sections
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Subjects
DROP POLICY IF EXISTS tenant_isolation_subjects ON subjects;
CREATE POLICY tenant_isolation_subjects ON subjects
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Teacher Assignments
DROP POLICY IF EXISTS tenant_isolation_teacher_assignments ON teacher_assignments;
CREATE POLICY tenant_isolation_teacher_assignments ON teacher_assignments
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Student Enrollments
DROP POLICY IF EXISTS tenant_isolation_student_enrollments ON student_enrollments;
CREATE POLICY tenant_isolation_student_enrollments ON student_enrollments
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Attendance Sessions
DROP POLICY IF EXISTS tenant_isolation_attendance_sessions ON attendance_sessions;
CREATE POLICY tenant_isolation_attendance_sessions ON attendance_sessions
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Attendance Records
DROP POLICY IF EXISTS tenant_isolation_attendance_records ON attendance_records;
CREATE POLICY tenant_isolation_attendance_records ON attendance_records
  FOR ALL USING (app.is_rls_bypassed() OR organization_id::text = current_setting('app.current_organization_id', true));

-- Leave Requests
DROP POLICY IF EXISTS tenant_isolation_leave_requests ON leave_requests;
CREATE POLICY tenant_isolation_leave_requests ON leave_requests
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- ==============================================================================
-- PHASE 5: RLS FOR FEE ENGINE, CHALLANS, RECEIPTS & PAYMENTS
-- ==============================================================================

ALTER TABLE fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structure_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE late_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- Fee Heads
DROP POLICY IF EXISTS tenant_isolation_fee_heads ON fee_heads;
CREATE POLICY tenant_isolation_fee_heads ON fee_heads
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Fee Structures
DROP POLICY IF EXISTS tenant_isolation_fee_structures ON fee_structures;
CREATE POLICY tenant_isolation_fee_structures ON fee_structures
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Student Fee Assignments
DROP POLICY IF EXISTS tenant_isolation_student_fee_assignments ON student_fee_assignments;
CREATE POLICY tenant_isolation_student_fee_assignments ON student_fee_assignments
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Discounts
DROP POLICY IF EXISTS tenant_isolation_discounts ON discounts;
CREATE POLICY tenant_isolation_discounts ON discounts
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Late Fee Rules
DROP POLICY IF EXISTS tenant_isolation_late_fee_rules ON late_fee_rules;
CREATE POLICY tenant_isolation_late_fee_rules ON late_fee_rules
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Fee Invoices
DROP POLICY IF EXISTS tenant_isolation_fee_invoices ON fee_invoices;
CREATE POLICY tenant_isolation_fee_invoices ON fee_invoices
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Payments
DROP POLICY IF EXISTS tenant_isolation_payments ON payments;
CREATE POLICY tenant_isolation_payments ON payments
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Receipts
DROP POLICY IF EXISTS tenant_isolation_receipts ON receipts;
CREATE POLICY tenant_isolation_receipts ON receipts
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );

-- Refunds
DROP POLICY IF EXISTS tenant_isolation_refunds ON refunds;
CREATE POLICY tenant_isolation_refunds ON refunds
  FOR ALL USING (
    app.is_rls_bypassed() OR (
      organization_id::text = current_setting('app.current_organization_id', true) AND (
        current_setting('app.current_campus_id', true) IS NULL OR
        campus_id::text = current_setting('app.current_campus_id', true)
      )
    )
  );



