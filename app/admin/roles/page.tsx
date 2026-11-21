import { prisma } from "@/lib/db/prisma";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function RolesAdminPage() {
  let roles: any[] = [];
  try {
    roles = await prisma.role.findMany({
      where: { deletedAt: null },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
  } catch {
    // Graceful fallback before migrations/seed
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Role-Based Access Control matrix defining granular authorizations and scopes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="border shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-bold">{role.name}</CardTitle>
                <Badge variant={role.isSystem ? "default" : "secondary"}>
                  {role.isSystem ? "System" : "Custom"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {role.description || "No description provided"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-muted-foreground">
                Granted Permissions ({role.rolePermissions.length}):
              </div>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                {role.rolePermissions.map((rp: any) => (
                  <Badge
                    key={rp.id}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0.5 bg-muted/30 font-mono"
                  >
                    {rp.permission.code}
                  </Badge>
                ))}
              </div>

              <div className="pt-2 border-t text-xs text-muted-foreground flex justify-between">
                <span>Active Users: {role._count.userRoles}</span>
                <span className="font-mono">slug: {role.slug}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {roles.length === 0 && (
          <div className="col-span-3 text-center p-12 border border-dashed rounded-lg text-muted-foreground">
            No roles found. Seed the database to view system roles and granular permissions.
          </div>
        )}
      </div>
    </div>
  );
}
