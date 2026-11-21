import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/security/password";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Phase 1 Database Seed...");

  // 1. Seed Granular Permissions
  console.log("1. Seeding Granular Permissions...");
  const permissionsData = [
    // Organizations
    { code: "organizations.create", name: "Create Organization", module: "organizations" },
    { code: "organizations.read", name: "Read Organization", module: "organizations" },
    { code: "organizations.update", name: "Update Organization", module: "organizations" },
    { code: "organizations.delete", name: "Delete Organization", module: "organizations" },

    // Campuses
    { code: "campuses.create", name: "Create Campus", module: "campuses" },
    { code: "campuses.read", name: "Read Campus", module: "campuses" },
    { code: "campuses.update", name: "Update Campus", module: "campuses" },
    { code: "campuses.delete", name: "Delete Campus", module: "campuses" },

    // Users & Roles
    { code: "users.create", name: "Create User", module: "users" },
    { code: "users.read", name: "Read User", module: "users" },
    { code: "users.update", name: "Update User", module: "users" },
    { code: "users.delete", name: "Delete User", module: "users" },

    { code: "roles.create", name: "Create Role", module: "roles" },
    { code: "roles.read", name: "Read Role", module: "roles" },
    { code: "roles.update", name: "Update Role", module: "roles" },
    { code: "roles.delete", name: "Delete Role", module: "roles" },

    // Students
    { code: "students.create", name: "Create Student", module: "students" },
    { code: "students.read", name: "Read Student", module: "students" },
    { code: "students.update", name: "Update Student", module: "students" },
    { code: "students.delete", name: "Delete Student", module: "students" },

    // Fees
    { code: "fees.create", name: "Create Fee Structure/Challan", module: "fees" },
    { code: "fees.read", name: "Read Fee Records", module: "fees" },
    { code: "fees.update", name: "Update Fee Records", module: "fees" },
    { code: "fees.delete", name: "Delete Fee Records", module: "fees" },
    { code: "fees.collect", name: "Collect Fee Payment", module: "fees" },
    { code: "fees.refund", name: "Process Fee Refund", module: "fees" },

    // Attendance
    { code: "attendance.create", name: "Create Attendance Session", module: "attendance" },
    { code: "attendance.read", name: "Read Attendance", module: "attendance" },
    { code: "attendance.update", name: "Update Attendance", module: "attendance" },
    { code: "attendance.delete", name: "Delete Attendance", module: "attendance" },
    { code: "attendance.mark", name: "Mark Daily Attendance", module: "attendance" },

    // Marks / Examinations
    { code: "marks.create", name: "Create Exam Marks", module: "marks" },
    { code: "marks.read", name: "Read Marks & Reports", module: "marks" },
    { code: "marks.update", name: "Update Marks", module: "marks" },
    { code: "marks.delete", name: "Delete Marks", module: "marks" },

    // Payroll & HR
    { code: "payroll.create", name: "Create Payroll Entry", module: "payroll" },
    { code: "payroll.read", name: "Read Payroll Reports", module: "payroll" },
    { code: "payroll.update", name: "Update Payroll", module: "payroll" },
    { code: "payroll.delete", name: "Delete Payroll", module: "payroll" },
    { code: "payroll.process", name: "Process Salary Disbursements", module: "payroll" },

    // Accounting
    { code: "accounting.create", name: "Create Journal Entry", module: "accounting" },
    { code: "accounting.read", name: "Read General Ledger", module: "accounting" },
    { code: "accounting.update", name: "Update Ledger Entry", module: "accounting" },
    { code: "accounting.delete", name: "Delete Ledger Entry", module: "accounting" },

    // Audit Logs
    { code: "audit_logs.view", name: "View Audit Trail Logs", module: "audit_logs" },
  ];

  const createdPermissions = new Map<string, string>();
  const existingPermissions = await prisma.permission.findMany();
  const existingPermMap = new Map(existingPermissions.map((p) => [p.code, p.id]));

  for (const perm of permissionsData) {
    if (existingPermMap.has(perm.code)) {
      createdPermissions.set(perm.code, existingPermMap.get(perm.code)!);
    } else {
      const record = await prisma.permission.create({ data: perm });
      createdPermissions.set(perm.code, record.id);
    }
  }
  console.log(`✓ Synchronized ${createdPermissions.size} permissions.`);

  // 2. Seed Standard System Roles
  console.log("2. Seeding Standard System Roles...");
  const systemRoles = [
    {
      name: "Platform Super Admin",
      slug: "platform_super_admin",
      description: "Full global access across all platform entities and tenants.",
      permissions: Array.from(createdPermissions.keys()),
    },
    {
      name: "Organization Admin",
      slug: "org_admin",
      description: "Administrator with complete authority over the organization and all campuses.",
      permissions: Array.from(createdPermissions.keys()).filter((p) => !p.startsWith("platform.")),
    },
    {
      name: "Principal",
      slug: "principal",
      description: "Campus executive leading academic operations and daily affairs.",
      permissions: [
        "campuses.read", "campuses.update", "users.read", "students.create",
        "students.read", "students.update", "attendance.create", "attendance.read",
        "attendance.update", "attendance.mark", "marks.read", "marks.update",
        "fees.read", "audit_logs.view",
      ],
    },
    {
      name: "Vice Principal",
      slug: "vice_principal",
      description: "Assists the Principal in academic supervision and discipline.",
      permissions: [
        "campuses.read", "students.read", "students.update", "attendance.read",
        "attendance.mark", "marks.read", "marks.update",
      ],
    },
    {
      name: "Teacher",
      slug: "teacher",
      description: "Faculty assigned to classes and sections for attendance and grading.",
      permissions: [
        "students.read", "attendance.read", "attendance.mark", "marks.create",
        "marks.read", "marks.update",
      ],
    },
    {
      name: "Accountant",
      slug: "accountant",
      description: "Manages fee collections, challans, refunds, and financial ledgers.",
      permissions: [
        "students.read", "fees.create", "fees.read", "fees.update",
        "fees.collect", "fees.refund", "accounting.create", "accounting.read",
        "accounting.update", "payroll.read",
      ],
    },
    {
      name: "HR Manager",
      slug: "hr_manager",
      description: "Manages staff profiles, contracts, and payroll processing.",
      permissions: [
        "users.read", "users.create", "users.update", "payroll.create",
        "payroll.read", "payroll.update", "payroll.process",
      ],
    },
    {
      name: "Receptionist",
      slug: "receptionist",
      description: "Handles inquiries, visitor logs, and daily parent front-desk communication.",
      permissions: ["students.read", "attendance.read", "fees.read"],
    },
    {
      name: "Staff",
      slug: "staff",
      description: "Support personnel with read access to general notices.",
      permissions: ["campuses.read"],
    },
    {
      name: "Parent",
      slug: "parent",
      description: "Guardian accessing children's attendance, marks, and fee invoices.",
      permissions: ["students.read", "attendance.read", "marks.read", "fees.read"],
    },
    {
      name: "Student",
      slug: "student",
      description: "Enrolled pupil viewing personal timetable, attendance, and grades.",
      permissions: ["attendance.read", "marks.read"],
    },
  ];

  const roleMap = new Map<string, string>();
  const existingRoles = await prisma.role.findMany({ where: { organizationId: null } });
  const existingRoleMap = new Map(existingRoles.map((r) => [r.slug, r.id]));

  for (const roleDef of systemRoles) {
    let roleId = existingRoleMap.get(roleDef.slug);
    if (!roleId) {
      const roleRecord = await prisma.role.create({
        data: {
          name: roleDef.name,
          slug: roleDef.slug,
          description: roleDef.description,
          isSystem: true,
          organizationId: null,
        },
      });
      roleId = roleRecord.id;
    }
    roleMap.set(roleDef.slug, roleId);
  }
  console.log(`✓ Synchronized ${roleMap.size} system roles.`);

  // 3. Seed Two Organizations with Multiple Campuses (Multi-Tenancy Testing)
  console.log("3. Seeding Sample Organizations & Campuses...");
  const defaultPasswordHash = await hashPassword("Admin123!Secure");

  // Organization 1: Apex Education Trust
  const org1 = await prisma.organization.upsert({
    where: { slug: "apex-education" },
    update: {},
    create: {
      name: "Apex Education Trust",
      slug: "apex-education",
      code: "APEX",
      status: "ACTIVE",
      settings: {
        create: {
          logoUrl: "https://assets.schooerp.dev/apex-logo.png",
          primaryColor: "#0284c7",
          secondaryColor: "#0369a1",
          timezone: "UTC",
          currency: "USD",
          dateFormat: "YYYY-MM-DD",
        },
      },
    },
  });

  const org1CampusA = await prisma.campus.upsert({
    where: { organizationId_code: { organizationId: org1.id, code: "APEX-MAIN" } },
    update: {},
    create: {
      organizationId: org1.id,
      name: "Apex Downtown Campus",
      code: "APEX-MAIN",
      address: "100 Grand Avenue, Downtown",
      city: "Metropolis",
      phone: "+1-555-0101",
      email: "downtown@apex.edu",
      settings: {
        create: {
          academicStartMonth: 8,
          workingDays: "MON,TUE,WED,THU,FRI",
        },
      },
    },
  });

  const org1CampusB = await prisma.campus.upsert({
    where: { organizationId_code: { organizationId: org1.id, code: "APEX-WEST" } },
    update: {},
    create: {
      organizationId: org1.id,
      name: "Apex Westside Campus",
      code: "APEX-WEST",
      address: "450 West Boulevard",
      city: "Metropolis",
      phone: "+1-555-0102",
      email: "westside@apex.edu",
      settings: {
        create: {
          academicStartMonth: 8,
          workingDays: "MON,TUE,WED,THU,FRI",
        },
      },
    },
  });

  // Organization 2: Beacon Academy Group
  const org2 = await prisma.organization.upsert({
    where: { slug: "beacon-academy" },
    update: {},
    create: {
      name: "Beacon Academy Group",
      slug: "beacon-academy",
      code: "BEACON",
      status: "ACTIVE",
      settings: {
        create: {
          logoUrl: "https://assets.schooerp.dev/beacon-logo.png",
          primaryColor: "#16a34a",
          secondaryColor: "#15803d",
          timezone: "UTC",
          currency: "EUR",
          dateFormat: "DD/MM/YYYY",
        },
      },
    },
  });

  const org2CampusA = await prisma.campus.upsert({
    where: { organizationId_code: { organizationId: org2.id, code: "BEACON-NORTH" } },
    update: {},
    create: {
      organizationId: org2.id,
      name: "Beacon North Campus",
      code: "BEACON-NORTH",
      address: "12 Northern Road",
      city: "Capitol City",
      phone: "+44-20-7946-0901",
      email: "north@beacon.edu",
    },
  });

  const org2CampusB = await prisma.campus.upsert({
    where: { organizationId_code: { organizationId: org2.id, code: "BEACON-SOUTH" } },
    update: {},
    create: {
      organizationId: org2.id,
      name: "Beacon South Campus",
      code: "BEACON-SOUTH",
      address: "88 South Hills Way",
      city: "Capitol City",
      phone: "+44-20-7946-0902",
      email: "south@beacon.edu",
    },
  });

  console.log(`✓ Seeded Organizations: "${org1.name}" (${org1CampusA.name}, ${org1CampusB.name}) and "${org2.name}" (${org2CampusA.name}, ${org2CampusB.name}).`);

  // 4. Seed Person -> User Account -> Role -> Assignment for Org 1
  console.log("4. Seeding Sample Users and Assignments (Identity Model)...");

  // Helper to upsert Person + User + Role + Assignment
  async function seedUserAccount(params: {
    orgId: string;
    campusId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    roleSlug: string;
    scopeType: string;
  }) {
    let person = await prisma.person.findFirst({
      where: { organizationId: params.orgId, email: params.email },
    });

    if (!person) {
      person = await prisma.person.create({
        data: {
          organizationId: params.orgId,
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
          phone: params.phone,
        },
      });
    }

    const user = await prisma.user.upsert({
      where: {
        organizationId_email: {
          organizationId: params.orgId,
          email: params.email,
        },
      },
      update: {},
      create: {
        organizationId: params.orgId,
        personId: person.id,
        email: params.email,
        passwordHash: defaultPasswordHash,
        status: "ACTIVE",
      },
    });

    const targetRoleId = roleMap.get(params.roleSlug)!;
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: targetRoleId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: targetRoleId,
      },
    });

    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        organizationId: params.orgId,
        userId: user.id,
        scopeType: params.scopeType,
        campusId: params.campusId ?? null,
      },
    });

    if (!existingAssignment) {
      await prisma.assignment.create({
        data: {
          organizationId: params.orgId,
          campusId: params.campusId ?? null,
          userId: user.id,
          scopeType: params.scopeType,
          isPrimary: true,
        },
      });
    }

    return user;
  }

  // Person 1: John Doe (Org 1 Admin)
  await seedUserAccount({
    orgId: org1.id,
    firstName: "John",
    lastName: "Doe",
    email: "admin@apex.edu",
    phone: "+1-555-1111",
    roleSlug: "org_admin",
    scopeType: "ORGANIZATION",
  });

  // Person 2: Sarah Miller (Org 1 Principal at Downtown Campus)
  await seedUserAccount({
    orgId: org1.id,
    campusId: org1CampusA.id,
    firstName: "Sarah",
    lastName: "Miller",
    email: "principal@apex.edu",
    phone: "+1-555-2222",
    roleSlug: "principal",
    scopeType: "CAMPUS",
  });

  // Person 3: Arthur Pendelton (Org 2 Admin)
  await seedUserAccount({
    orgId: org2.id,
    firstName: "Arthur",
    lastName: "Pendelton",
    email: "admin@beacon.edu",
    phone: "+44-20-7946-0111",
    roleSlug: "org_admin",
    scopeType: "ORGANIZATION",
  });

  // ==============================================================================
  // 5. DEMO SEEDING: ACADEMICS, TEACHERS, STUDENTS, ATTENDANCE & FEES (APEX TRUST)
  // ==============================================================================
  console.log("5. Seeding Realistic Demo Data for Apex Education Trust...");

  // Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: { campusId_code: { campusId: org1CampusA.id, code: "AY-2026-2027" } },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      name: "Academic Year 2026-2027",
      code: "AY-2026-2027",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2027-06-30"),
      isCurrent: true,
      status: "ACTIVE",
    },
  });

  // Classes & Sections (Grade 1 & Grade 2)
  const class1 = await prisma.class.upsert({
    where: { campusId_code: { campusId: org1CampusA.id, code: "G1" } },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      name: "Grade 1",
      code: "G1",
      order: 1,
    },
  });

  const section1A = await prisma.section.upsert({
    where: { classId_code: { classId: class1.id, code: "A" } },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      classId: class1.id,
      name: "Section A",
      code: "A",
      capacity: 30,
    },
  });

  const class2 = await prisma.class.upsert({
    where: { campusId_code: { campusId: org1CampusA.id, code: "G2" } },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      name: "Grade 2",
      code: "G2",
      order: 2,
    },
  });

  const section2A = await prisma.section.upsert({
    where: { classId_code: { classId: class2.id, code: "A" } },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      classId: class2.id,
      name: "Section A",
      code: "A",
      capacity: 30,
    },
  });

  // Subjects
  const mathSubject = await prisma.subject.upsert({
    where: { campusId_code: { campusId: org1CampusA.id, code: "MATH-01" } },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      name: "Mathematics",
      code: "MATH-01",
      type: "THEORY",
    },
  });

  const englishSubject = await prisma.subject.upsert({
    where: { campusId_code: { campusId: org1CampusA.id, code: "ENG-01" } },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      name: "English Literature",
      code: "ENG-01",
      type: "THEORY",
    },
  });

  // 2 Teachers (Staff + Teacher Profile + Class Teacher Assignment)
  // Teacher 1: Emily Watson (Grade 1-A Class Teacher)
  const teacherUser1 = await seedUserAccount({
    orgId: org1.id,
    campusId: org1CampusA.id,
    firstName: "Emily",
    lastName: "Watson",
    email: "teacher1@apex.edu",
    phone: "+1-555-3001",
    roleSlug: "teacher",
    scopeType: "CLASS",
  });

  const staff1 = await prisma.staff.upsert({
    where: { organizationId_employeeNumber: { organizationId: org1.id, employeeNumber: "EMP-001" } },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      personId: teacherUser1.personId,
      employeeNumber: "EMP-001",
      designation: "Senior Primary Teacher",
      department: "Primary Academics",
      status: "ACTIVE",
    },
  });

  const teacherProfile1 = await prisma.teacher.upsert({
    where: { staffId: staff1.id },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      staffId: staff1.id,
      specialization: "Early Childhood & Mathematics",
    },
  });

  // Teacher 2: David Robert (Grade 2-A Class Teacher)
  const teacherUser2 = await seedUserAccount({
    orgId: org1.id,
    campusId: org1CampusA.id,
    firstName: "David",
    lastName: "Robert",
    email: "teacher2@apex.edu",
    phone: "+1-555-3002",
    roleSlug: "teacher",
    scopeType: "CLASS",
  });

  const staff2 = await prisma.staff.upsert({
    where: { organizationId_employeeNumber: { organizationId: org1.id, employeeNumber: "EMP-002" } },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      personId: teacherUser2.personId,
      employeeNumber: "EMP-002",
      designation: "Primary Teacher",
      department: "Primary Academics",
      status: "ACTIVE",
    },
  });

  const teacherProfile2 = await prisma.teacher.upsert({
    where: { staffId: staff2.id },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      staffId: staff2.id,
      specialization: "English & Social Studies",
    },
  });

  // Assign Class Teachers
  const existingAssign1 = await prisma.teacherAssignment.findFirst({
    where: { academicYearId: academicYear.id, classId: class1.id, sectionId: section1A.id, isClassTeacher: true },
  });
  if (!existingAssign1) {
    await prisma.teacherAssignment.create({
      data: {
        organizationId: org1.id,
        campusId: org1CampusA.id,
        academicYearId: academicYear.id,
        classId: class1.id,
        sectionId: section1A.id,
        teacherId: teacherProfile1.id,
        isClassTeacher: true,
      },
    });
  }

  const existingAssign2 = await prisma.teacherAssignment.findFirst({
    where: { academicYearId: academicYear.id, classId: class2.id, sectionId: section2A.id, isClassTeacher: true },
  });
  if (!existingAssign2) {
    await prisma.teacherAssignment.create({
      data: {
        organizationId: org1.id,
        campusId: org1CampusA.id,
        academicYearId: academicYear.id,
        classId: class2.id,
        sectionId: section2A.id,
        teacherId: teacherProfile2.id,
        isClassTeacher: true,
      },
    });
  }

  // Fee Heads & Structures
  const tuitionHead = await prisma.feeHead.upsert({
    where: { campusId_code: { campusId: org1CampusA.id, code: "TUIT-STD" } },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      name: "Standard Tuition Fee",
      code: "TUIT-STD",
      type: "RECURRING",
      description: "Monthly academic tuition charges",
    },
  });

  const transportHead = await prisma.feeHead.upsert({
    where: { campusId_code: { campusId: org1CampusA.id, code: "TRANS-BUS" } },
    update: {},
    create: {
      organizationId: org1.id,
      campusId: org1CampusA.id,
      name: "Campus Transport Service",
      code: "TRANS-BUS",
      type: "RECURRING",
      description: "Daily pickup and drop transportation",
    },
  });

  let feeStructure = await prisma.feeStructure.findFirst({
    where: { organizationId: org1.id, campusId: org1CampusA.id, name: "Primary Standard Structure" },
  });

  if (!feeStructure) {
    feeStructure = await prisma.feeStructure.create({
      data: {
        organizationId: org1.id,
        campusId: org1CampusA.id,
        academicYearId: academicYear.id,
        classId: class1.id,
        name: "Primary Standard Structure",
        frequency: "MONTHLY",
        items: {
          create: [
            { feeHeadId: tuitionHead.id, amount: 650.00 },
            { feeHeadId: transportHead.id, amount: 150.00 },
          ],
        },
      },
    });
  }

  // 10 Students with Families and Enrollments
  const sampleStudents = [
    { first: "Oliver", last: "Smith", adm: "ADM-2026-001", roll: "101", classId: class1.id, sectionId: section1A.id, pFirst: "Liam", pLast: "Smith" },
    { first: "Emma", last: "Johnson", adm: "ADM-2026-002", roll: "102", classId: class1.id, sectionId: section1A.id, pFirst: "Noah", pLast: "Johnson" },
    { first: "William", last: "Brown", adm: "ADM-2026-003", roll: "103", classId: class1.id, sectionId: section1A.id, pFirst: "James", pLast: "Brown" },
    { first: "Sophia", last: "Davis", adm: "ADM-2026-004", roll: "104", classId: class1.id, sectionId: section1A.id, pFirst: "Benjamin", pLast: "Davis" },
    { first: "Lucas", last: "Miller", adm: "ADM-2026-005", roll: "105", classId: class1.id, sectionId: section1A.id, pFirst: "Lucas", pLast: "Miller Sr." },
    { first: "Mia", last: "Wilson", adm: "ADM-2026-006", roll: "201", classId: class2.id, sectionId: section2A.id, pFirst: "Henry", pLast: "Wilson" },
    { first: "Alexander", last: "Moore", adm: "ADM-2026-007", roll: "202", classId: class2.id, sectionId: section2A.id, pFirst: "Alexander", pLast: "Moore Sr." },
    { first: "Charlotte", last: "Taylor", adm: "ADM-2026-008", roll: "203", classId: class2.id, sectionId: section2A.id, pFirst: "Michael", pLast: "Taylor" },
    { first: "Daniel", last: "Anderson", adm: "ADM-2026-009", roll: "204", classId: class2.id, sectionId: section2A.id, pFirst: "Daniel", pLast: "Anderson Sr." },
    { first: "Amelia", last: "Thomas", adm: "ADM-2026-010", roll: "205", classId: class2.id, sectionId: section2A.id, pFirst: "Elijah", pLast: "Thomas" },
  ];

  const seededStudents = [];

  for (const s of sampleStudents) {
    // 1. Parent Person & Profile
    let parentPerson = await prisma.person.findFirst({
      where: { organizationId: org1.id, email: `parent.${s.last.toLowerCase()}@example.com` },
    });
    if (!parentPerson) {
      parentPerson = await prisma.person.create({
        data: {
          organizationId: org1.id,
          firstName: s.pFirst,
          lastName: s.pLast,
          email: `parent.${s.last.toLowerCase()}@example.com`,
          phone: "+1-555-0" + Math.floor(1000 + Math.random() * 9000),
        },
      });
    }

    const parentProfile = await prisma.parent.upsert({
      where: { personId: parentPerson.id },
      update: {},
      create: {
        organizationId: org1.id,
        personId: parentPerson.id,
        occupation: "Professional",
      },
    });

    // 2. Family
    const family = await prisma.family.upsert({
      where: { organizationId_familyCode: { organizationId: org1.id, familyCode: `FAM-${s.last.toUpperCase()}` } },
      update: {},
      create: {
        organizationId: org1.id,
        familyCode: `FAM-${s.last.toUpperCase()}`,
        familyName: `The ${s.last} Family`,
        primaryContactPhone: parentPerson.phone,
      },
    });

    await prisma.familyMember.upsert({
      where: { familyId_personId: { familyId: family.id, personId: parentPerson.id } },
      update: {},
      create: {
        organizationId: org1.id,
        familyId: family.id,
        personId: parentPerson.id,
        relationship: "FATHER",
        isPrimaryContact: true,
      },
    });

    // 3. Student Person & Student Profile
    let studentPerson = await prisma.person.findFirst({
      where: { organizationId: org1.id, email: `${s.first.toLowerCase()}.${s.last.toLowerCase()}@student.apex.edu` },
    });
    if (!studentPerson) {
      studentPerson = await prisma.person.create({
        data: {
          organizationId: org1.id,
          firstName: s.first,
          lastName: s.last,
          email: `${s.first.toLowerCase()}.${s.last.toLowerCase()}@student.apex.edu`,
          dateOfBirth: new Date("2018-05-15"),
        },
      });
    }

    const student = await prisma.student.upsert({
      where: { organizationId_admissionNumber: { organizationId: org1.id, admissionNumber: s.adm } },
      update: {},
      create: {
        organizationId: org1.id,
        campusId: org1CampusA.id,
        personId: studentPerson.id,
        admissionNumber: s.adm,
        studentNumber: s.roll,
        status: "ACTIVE",
      },
    });

    await prisma.familyMember.upsert({
      where: { familyId_personId: { familyId: family.id, personId: studentPerson.id } },
      update: {},
      create: {
        organizationId: org1.id,
        familyId: family.id,
        personId: studentPerson.id,
        relationship: "CHILD",
      },
    });

    // Student Guardian link
    await prisma.studentGuardian.upsert({
      where: { studentId_parentId: { studentId: student.id, parentId: parentProfile.id } },
      update: {},
      create: {
        organizationId: org1.id,
        studentId: student.id,
        parentId: parentProfile.id,
        familyId: family.id,
        relationship: "FATHER",
        isPrimary: true,
      },
    });

    // Enrollment
    await prisma.studentEnrollment.upsert({
      where: { academicYearId_studentId: { academicYearId: academicYear.id, studentId: student.id } },
      update: {},
      create: {
        organizationId: org1.id,
        campusId: org1CampusA.id,
        academicYearId: academicYear.id,
        studentId: student.id,
        classId: s.classId,
        sectionId: s.sectionId,
        rollNumber: s.roll,
        status: "ACTIVE",
      },
    });

    // Fee Assignment
    await prisma.studentFeeAssignment.upsert({
      where: { studentId_feeStructureId_academicYearId: { studentId: student.id, feeStructureId: feeStructure.id, academicYearId: academicYear.id } },
      update: {},
      create: {
        organizationId: org1.id,
        campusId: org1CampusA.id,
        studentId: student.id,
        feeStructureId: feeStructure.id,
        academicYearId: academicYear.id,
        classId: s.classId,
      },
    });

    seededStudents.push(student);
  }
  console.log(`✓ Seeded 10 Students, Families, Enrollments & Fee Assignments.`);

  // Daily Attendance Session for Grade 1-A
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let attendanceSession = await prisma.attendanceSession.findFirst({
    where: { classId: class1.id, sectionId: section1A.id, date: today },
  });

  if (!attendanceSession) {
    attendanceSession = await prisma.attendanceSession.create({
      data: {
        organizationId: org1.id,
        campusId: org1CampusA.id,
        academicYearId: academicYear.id,
        classId: class1.id,
        sectionId: section1A.id,
        date: today,
        takenById: teacherUser1.id,
        status: "SUBMITTED",
      },
    });

    const grade1Students = seededStudents.slice(0, 5);
    for (let i = 0; i < grade1Students.length; i++) {
      await prisma.attendanceRecord.create({
        data: {
          organizationId: org1.id,
          sessionId: attendanceSession.id,
          studentId: grade1Students[i].id,
          status: i === 4 ? "ABSENT" : "PRESENT", // Student 5 is marked absent
          remarks: i === 4 ? "Notified flu absence" : "On time",
        },
      });
    }
  }
  console.log(`✓ Seeded Sample Attendance Session for Grade 1-A.`);

  // 5 Fee Challans (3 Paid with Receipts, 2 Unpaid/Partial)
  const challanConfigs = [
    { studentIdx: 0, status: "PAID", invoiceNumber: "CH-2026-0001", total: 800.00, paid: 800.00 },
    { studentIdx: 1, status: "PAID", invoiceNumber: "CH-2026-0002", total: 800.00, paid: 800.00 },
    { studentIdx: 2, status: "PAID", invoiceNumber: "CH-2026-0003", total: 800.00, paid: 800.00 },
    { studentIdx: 3, status: "PARTIAL", invoiceNumber: "CH-2026-0004", total: 800.00, paid: 400.00 },
    { studentIdx: 4, status: "UNPAID", invoiceNumber: "CH-2026-0005", total: 800.00, paid: 0.00 },
  ];

  for (let idx = 0; idx < challanConfigs.length; idx++) {
    const cfg = challanConfigs[idx];
    const student = seededStudents[cfg.studentIdx];

    const existingInv = await prisma.feeInvoice.findFirst({
      where: { organizationId: org1.id, invoiceNumber: cfg.invoiceNumber },
    });

    if (!existingInv) {
      const invoice = await prisma.feeInvoice.create({
        data: {
          organizationId: org1.id,
          campusId: org1CampusA.id,
          studentId: student.id,
          academicYearId: academicYear.id,
          classId: class1.id,
          invoiceNumber: cfg.invoiceNumber,
          title: "October 2026 Standard Tuition & Transport",
          issueDate: new Date("2026-10-01"),
          dueDate: new Date("2026-10-15"),
          subtotal: 800.00,
          discountAmount: 0.00,
          lateFeeAmount: 0.00,
          arrearsAmount: 0.00,
          totalAmount: cfg.total,
          paidAmount: cfg.paid,
          balanceAmount: cfg.total - cfg.paid,
          status: cfg.status,
          items: {
            create: [
              { feeHeadId: tuitionHead.id, description: "Tuition Fee", amount: 650.00 },
              { feeHeadId: transportHead.id, description: "Transport Fee", amount: 150.00 },
            ],
          },
        },
      });

      // If paid or partial, create Payment, PaymentAllocation, and Receipt
      if (cfg.paid > 0) {
        const paymentNumber = `PAY-2026-${String(idx + 1).padStart(5, "0")}`;
        const payment = await prisma.payment.create({
          data: {
            organizationId: org1.id,
            campusId: org1CampusA.id,
            studentId: student.id,
            paymentNumber,
            amount: cfg.paid,
            paymentMethod: idx % 2 === 0 ? "CASH" : "BANK_TRANSFER",
            status: "COMPLETED",
          },
        });

        await prisma.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: invoice.id,
            allocatedAmount: cfg.paid,
          },
        });

        const receiptNumber = `REC-2026-${String(idx + 1).padStart(5, "0")}`;
        await prisma.receipt.create({
          data: {
            organizationId: org1.id,
            campusId: org1CampusA.id,
            paymentId: payment.id,
            receiptNumber,
            accessToken: `demo-receipt-token-${idx + 1}-${student.id.slice(0, 8)}`,
          },
        });
      }
    }
  }
  console.log(`✓ Seeded 5 Fee Challans (3 Paid with Receipts, 1 Partial, 1 Unpaid).`);

  // 6. Initial Audit Log (Idempotent check)
  const existingAudit = await prisma.auditLog.findFirst({
    where: {
      organizationId: org1.id,
      action: "CREATE",
      resource: "ORGANIZATION",
    },
  });

  if (!existingAudit) {
    await prisma.auditLog.create({
      data: {
        organizationId: org1.id,
        action: "CREATE",
        resource: "ORGANIZATION",
        resourceId: org1.id,
        newValues: { name: org1.name, code: org1.code },
        ipAddress: "127.0.0.1",
        userAgent: "Prisma Seed Script",
      },
    });
  }

  console.log("✅ All Demo Seed Data Successfully Synchronized!");
}

main()
  .catch((e) => {
    console.error("❌ Seed Script Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
