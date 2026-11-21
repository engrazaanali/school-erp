import { requireServerSession } from "@/server/auth/session";
import { StudentRepository } from "@/server/repositories/student.repository";
import { CampusRepository } from "@/server/repositories/campus.repository";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StudentCreateModal from "./student-create-modal";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const user = await requireServerSession();

  let students: any[] = [];
  let campuses: any[] = [];

  try {
    const [studentsResult, campusesList] = await Promise.all([
      StudentRepository.list(user.organizationId, {
        campusId: user.primaryCampusId,
        limit: 50,
      }),
      CampusRepository.list(user.organizationId),
    ]);
    students = studentsResult.items;
    campuses = campusesList.items;
  } catch {
    // Graceful fallback
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Student Directory</h1>
          <p className="text-sm text-muted-foreground">
            Manage student records, family connections, and campus-scoped enrollments.
          </p>
        </div>
        <StudentCreateModal campuses={campuses} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {students.length === 0 ? (
          <Card className="border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-sm">No students registered yet in this campus.</p>
            <p className="text-xs mt-1">Use the Register Student button above to add the first pupil.</p>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase border-b">
                <tr>
                  <th className="px-4 py-3">Admission #</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Campus</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Emergency Contact</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{student.admissionNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {student.person.firstName} {student.person.lastName}
                      </div>
                      {student.person.email && (
                        <div className="text-xs text-muted-foreground">{student.person.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {student.campus.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={student.status === "ACTIVE" ? "default" : "secondary"}>
                        {student.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {student.emergencyContactName ? (
                        <div>
                          <span>{student.emergencyContactName}</span>
                          {student.emergencyContactPhone && (
                            <span className="block font-mono">{student.emergencyContactPhone}</span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(student.admissionDate).toLocaleDateString()}
                    </td>
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
