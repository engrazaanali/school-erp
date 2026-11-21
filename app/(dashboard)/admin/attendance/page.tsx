import { requireServerSession } from "@/server/auth/session";
import { AcademicRepository } from "@/server/repositories/academic.repository";
import { StudentRepository } from "@/server/repositories/student.repository";
import AttendanceSheet from "./attendance-sheet";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const user = await requireServerSession();

  let classes: any[] = [];
  let students: any[] = [];
  let currentYear: any = null;

  try {
    const [classesList, studentsList, yearsList] = await Promise.all([
      AcademicRepository.listClasses(user.organizationId, user.primaryCampusId || undefined),
      StudentRepository.list(user.organizationId, {
        campusId: user.primaryCampusId || undefined,
        limit: 100,
      }),
      AcademicRepository.listAcademicYears(user.organizationId, user.primaryCampusId || undefined),
    ]);
    classes = classesList;
    students = studentsList.items;
    currentYear = yearsList.find((y) => y.isCurrent) || yearsList[0] || null;
  } catch {
    // Graceful fallback
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Class Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Take roll call for assigned classes. Unexcused absent marks emit instant WhatsApp alert hooks.
        </p>
      </div>

      <AttendanceSheet
        classes={classes}
        students={students}
        academicYearId={currentYear?.id || ""}
        campusId={user.primaryCampusId || classes[0]?.campusId || ""}
      />
    </div>
  );
}
