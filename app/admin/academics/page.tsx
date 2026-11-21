import { requireServerSession } from "@/server/auth/session";
import { AcademicRepository } from "@/server/repositories/academic.repository";
import { CampusRepository } from "@/server/repositories/campus.repository";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AcademicCreateModal from "./academic-create-modal";

export const dynamic = "force-dynamic";

export default async function AcademicsPage() {
  const user = await requireServerSession();

  let academicYears: any[] = [];
  let classes: any[] = [];
  let subjects: any[] = [];
  let campuses: any[] = [];

  try {
    const [yearsList, classesList, subjectsList, campusesList] = await Promise.all([
      AcademicRepository.listAcademicYears(user.organizationId, user.primaryCampusId || undefined),
      AcademicRepository.listClasses(user.organizationId, user.primaryCampusId || undefined),
      AcademicRepository.listSubjects(user.organizationId, user.primaryCampusId || undefined),
      CampusRepository.list(user.organizationId),
    ]);
    academicYears = yearsList;
    classes = classesList;
    subjects = subjectsList;
    campuses = campusesList.items;
  } catch {
    // Graceful fallback
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Academic Structure</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic years, classes, sections, subjects, and teacher allocations.
          </p>
        </div>
        <AcademicCreateModal campuses={campuses} />
      </div>

      {/* 1. Academic Years */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Academic Years & Sessions</h2>
        {academicYears.length === 0 ? (
          <Card className="border border-dashed p-6 text-center text-muted-foreground">
            <p className="text-sm">No academic years configured yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {academicYears.map((ay) => (
              <Card key={ay.id} className="border shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={ay.isCurrent ? "default" : "outline"} className="text-xs">
                      {ay.isCurrent ? "Current Session" : ay.status}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">{ay.code}</span>
                  </div>
                  <CardTitle className="text-base font-bold">{ay.name}</CardTitle>
                  <CardDescription className="text-xs">{ay.campus.name}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <div>
                    📅 {new Date(ay.startDate).toLocaleDateString()} —{" "}
                    {new Date(ay.endDate).toLocaleDateString()}
                  </div>
                  <div className="text-[11px] pt-1">
                    👥 {ay._count.studentEnrollments} Enrolled • 🎓 {ay._count.teacherAssignments} Teacher Allocations
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 2. Classes & Sections */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Classes & Active Sections</h2>
        {classes.length === 0 ? (
          <Card className="border border-dashed p-6 text-center text-muted-foreground">
            <p className="text-sm">No classes created yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Card key={cls.id} className="border shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs font-mono">
                      {cls.code}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Order: {cls.order}</span>
                  </div>
                  <CardTitle className="text-base font-bold">{cls.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {cls.campus.name} {cls.stage ? `• ${cls.stage}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">Sections: </span>
                    {cls.sections.length === 0 ? (
                      <span className="text-muted-foreground">None</span>
                    ) : (
                      cls.sections.map((s: any) => (
                        <span key={s.id} className="inline-block bg-muted px-2 py-0.5 rounded text-[11px] mr-1">
                          {s.name} (Cap: {s.capacity})
                        </span>
                      ))
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Subjects: </span>
                    <span className="text-muted-foreground">{cls.classSubjects.length} mapped</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 3. Subjects Catalog */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Subjects Catalog</h2>
        {subjects.length === 0 ? (
          <Card className="border border-dashed p-6 text-center text-muted-foreground">
            <p className="text-sm">No subjects registered yet.</p>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase border-b">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Subject Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Credit Hours</th>
                  <th className="px-4 py-3">Campus</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{sub.code}</td>
                    <td className="px-4 py-3 font-medium">{sub.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {sub.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {sub.creditHours ? `${sub.creditHours} hrs` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{sub.campus.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
