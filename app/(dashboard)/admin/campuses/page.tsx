import { prisma } from "@/lib/db/prisma";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CampusesAdminPage() {
  let campuses: any[] = [];
  try {
    campuses = await prisma.campus.findMany({
      where: { deletedAt: null },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        settings: true,
        _count: {
          select: {
            assignments: true,
          },
        },
      },
      orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
    });
  } catch {
    // Graceful fallback before migrations/seed
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campuses & Branches</h1>
          <p className="text-sm text-muted-foreground">
            Multi-campus hierarchy scoped strictly under their respective parent organizations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campuses.map((campus) => (
          <Card key={campus.id} className="border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <Badge variant="outline" className="text-xs mb-1">
                  {campus.organization.name}
                </Badge>
                <Badge variant={campus.status === "ACTIVE" ? "default" : "secondary"}>
                  {campus.status}
                </Badge>
              </div>
              <CardTitle className="text-base font-bold">{campus.name}</CardTitle>
              <CardDescription className="text-xs font-mono">
                Code: {campus.code}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              {campus.address && <div>📍 {campus.address}, {campus.city}</div>}
              {campus.phone && <div>📞 {campus.phone}</div>}
              {campus.email && <div>✉️ {campus.email}</div>}

              {campus.settings && (
                <div className="pt-2 border-t mt-2">
                  Academic Start Month: {campus.settings.academicStartMonth} • Working Days: {campus.settings.workingDays}
                </div>
              )}

              <div className="pt-2 border-t text-muted-foreground flex justify-between">
                <span>Staff/Faculty Assignments: {campus._count.assignments}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {campuses.length === 0 && (
          <div className="col-span-3 text-center p-12 border border-dashed rounded-lg text-muted-foreground">
            No campuses found in database. Run the seed script to populate campuses.
          </div>
        )}
      </div>
    </div>
  );
}
