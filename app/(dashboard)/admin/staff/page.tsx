import { requireServerSession } from "@/server/auth/session";
import { StaffRepository } from "@/server/repositories/staff.repository";
import { CampusRepository } from "@/server/repositories/campus.repository";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StaffCreateModal from "./staff-create-modal";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await requireServerSession();

  let staffMembers: any[] = [];
  let campuses: any[] = [];

  try {
    const [staffResult, campusesList] = await Promise.all([
      StaffRepository.list(user.organizationId, {
        campusId: user.primaryCampusId,
        limit: 50,
      }),
      CampusRepository.list(user.organizationId),
    ]);
    staffMembers = staffResult.items;
    campuses = campusesList.items;
  } catch {
    // Graceful fallback
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff & Faculty Directory</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic teachers, administrative staff, and campus department assignments.
          </p>
        </div>
        <StaffCreateModal campuses={campuses} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {staffMembers.length === 0 ? (
          <Card className="border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-sm">No staff or teachers registered yet.</p>
            <p className="text-xs mt-1">Use the Add Staff Member button above to add faculty.</p>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase border-b">
                <tr>
                  <th className="px-4 py-3">Emp #</th>
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Designation / Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Campus</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staffMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{member.employeeNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {member.person.firstName} {member.person.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{member.person.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-xs">{member.designation}</div>
                      {member.teacher && (
                        <Badge variant="outline" className="text-[10px] mt-0.5 border-primary/40 text-primary">
                          Faculty / Teacher
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {member.department || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {member.campus.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"}>
                        {member.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(member.joiningDate).toLocaleDateString()}
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
