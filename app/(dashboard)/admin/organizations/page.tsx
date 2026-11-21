import { prisma } from "@/lib/db/prisma";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function OrganizationsAdminPage() {
  let organizations: any[] = [];
  try {
    organizations = await prisma.organization.findMany({
      where: { deletedAt: null },
      include: {
        settings: true,
        campuses: { where: { deletedAt: null } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Graceful fallback before migrations/seed
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations & Tenants</h1>
          <p className="text-sm text-muted-foreground">
            Manage multi-tenant school organizations, branding themes, and domain slugs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {organizations.map((org) => (
          <Card key={org.id} className="border shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-bold">{org.name}</CardTitle>
                <CardDescription className="text-xs font-mono">
                  Slug: {org.slug} • Code: {org.code}
                </CardDescription>
              </div>
              <Badge variant={org.status === "ACTIVE" ? "default" : "secondary"}>
                {org.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {org.settings && (
                <div className="flex items-center gap-3 text-xs bg-muted/40 p-2.5 rounded-md">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: org.settings.primaryColor || "#2563eb" }}
                  />
                  <span>Timezone: {org.settings.timezone}</span>
                  <span>•</span>
                  <span>Currency: {org.settings.currency}</span>
                  <span>•</span>
                  <span>Date Format: {org.settings.dateFormat}</span>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Campuses ({org.campuses.length}): </span>
                {org.campuses.map((c: any) => c.name).join(", ") || "No campuses configured yet"}
              </div>

              <div className="text-xs text-muted-foreground flex justify-between pt-2 border-t">
                <span>Enrolled Users: {org._count.users}</span>
                <span>Created: {new Date(org.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {organizations.length === 0 && (
          <div className="col-span-2 text-center p-12 border border-dashed rounded-lg text-muted-foreground">
            No organizations found in database. Run the seed script to populate sample tenants.
          </div>
        )}
      </div>
    </div>
  );
}
