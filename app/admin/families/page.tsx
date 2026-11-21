import { requireServerSession } from "@/server/auth/session";
import { FamilyRepository } from "@/server/repositories/family.repository";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FamilyCreateModal from "./family-create-modal";

export const dynamic = "force-dynamic";

export default async function FamiliesPage() {
  const user = await requireServerSession();

  let families: any[] = [];
  try {
    const result = await FamilyRepository.list(user.organizationId, { limit: 50 });
    families = result.items;
  } catch {
    // Graceful fallback
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Families & Guardians</h1>
          <p className="text-sm text-muted-foreground">
            Manage multi-child family households, parent accounts, and guardian pickups.
          </p>
        </div>
        <FamilyCreateModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {families.length === 0 ? (
          <div className="col-span-full">
            <Card className="border border-dashed p-8 text-center text-muted-foreground">
              <p className="text-sm">No families created yet.</p>
              <p className="text-xs mt-1">Use the Create Family button above to register a household.</p>
            </Card>
          </div>
        ) : (
          families.map((family) => (
            <Card key={family.id} className="border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Badge variant="outline" className="text-xs mb-1 font-mono">
                    {family.familyCode}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {family.studentGuardians.length} Child(ren)
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold">{family.familyName}</CardTitle>
                {family.primaryContactName && (
                  <CardDescription className="text-xs">
                    Primary: {family.primaryContactName}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                {family.primaryContactPhone && <div>📞 {family.primaryContactPhone}</div>}
                {family.primaryContactEmail && <div>✉️ {family.primaryContactEmail}</div>}
                {family.address && <div>📍 {family.address}, {family.city}</div>}

                {family.studentGuardians.length > 0 && (
                  <div className="pt-2 border-t mt-2">
                    <span className="font-semibold text-foreground">Linked Students:</span>
                    <ul className="mt-1 space-y-1">
                      {family.studentGuardians.map((sg: any) => (
                        <li key={sg.id} className="flex justify-between items-center bg-muted/40 p-1.5 rounded">
                          <span>
                            {sg.student.person.firstName} {sg.student.person.lastName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {sg.student.campus.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
