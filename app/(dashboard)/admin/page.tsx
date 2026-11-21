import { prisma } from "@/lib/db/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let orgCount = 0;
  let campusCount = 0;
  let roleCount = 0;
  let auditCount = 0;

  try {
    [orgCount, campusCount, roleCount, auditCount] = await Promise.all([
      prisma.organization.count({ where: { deletedAt: null } }),
      prisma.campus.count({ where: { deletedAt: null } }),
      prisma.role.count({ where: { deletedAt: null } }),
      prisma.auditLog.count(),
    ]);
  } catch {
    // Graceful fallback if database has not yet been seeded
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
          <p className="text-sm text-muted-foreground">
            Multi-Tenant School ERP SaaS — Phase 1 Foundation Active
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild size="sm">
            <Link href="/admin/organizations">Manage Tenants</Link>
          </Button>
          <Button variant="default" asChild size="sm">
            <Link href="/admin/campuses">Manage Campuses</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{orgCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Active tenant domains</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Campuses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{campusCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Multi-campus isolation enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              RBAC Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{roleCount}</div>
            <p className="text-xs text-muted-foreground mt-1">System default & tenant roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Audit Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{auditCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Immutable audit trails recorded</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
