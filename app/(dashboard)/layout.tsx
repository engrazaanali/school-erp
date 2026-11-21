import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/server/auth/session";
import { Badge } from "@/components/ui/badge";
import LogoutButton from "@/components/shared/logout-button";

interface NavItem {
  href: string;
  label: string;
  requiredPermission?: string;
}

const NAV_SECTIONS: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: "Overview",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    heading: "People & Admissions",
    items: [
      {
        href: "/admin/students",
        label: "Students Directory",
        requiredPermission: "students.read",
      },
      {
        href: "/admin/families",
        label: "Families & Guardians",
        requiredPermission: "students.read",
      },
      {
        href: "/admin/staff",
        label: "Staff & Teachers",
        requiredPermission: "users.read",
      },
      {
        href: "/admin/admissions",
        label: "Admissions Pipeline",
        requiredPermission: "students.read",
      },
    ],
  },
  {
    heading: "Academics & Attendance",
    items: [
      {
        href: "/admin/academics",
        label: "Academic Structure",
        requiredPermission: "academics.read",
      },
      {
        href: "/admin/attendance",
        label: "Daily Attendance",
        requiredPermission: "attendance.read",
      },
    ],
  },
  {
    heading: "Fees & Finance (MVP)",
    items: [
      {
        href: "/admin/fees",
        label: "Fees & Challans",
        requiredPermission: "fees.view",
      },
      {
        href: "/admin/reports/financial",
        label: "Financial Reports",
        requiredPermission: "fees.view",
      },
    ],
  },
  {
    heading: "Administration",
    items: [
      {
        href: "/admin/organizations",
        label: "Organizations & Tenants",
        requiredPermission: "organizations.read",
      },
      {
        href: "/admin/campuses",
        label: "Campuses & Branches",
        requiredPermission: "campuses.read",
      },
      {
        href: "/admin/roles",
        label: "Roles & Permissions",
        requiredPermission: "roles.read",
      },
    ],
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSession();

  if (!user) {
    redirect("/login");
  }

  const allPermissions = new Set<string>(
    user.roles.flatMap((r) => r.permissions)
  );

  function canSee(item: NavItem): boolean {
    if (!item.requiredPermission) return true;
    return allPermissions.has(item.requiredPermission);
  }

  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r bg-muted/20 flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <Link href="/admin" className="font-bold text-lg tracking-tight">
            School ERP
          </Link>
          <Badge variant="outline" className="text-xs">
            Phase 5 (MVP)
          </Badge>
        </div>

        <nav className="flex-1 p-4 space-y-1 text-sm font-medium overflow-y-auto">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(canSee);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.heading}>
                <div className="pt-4 pb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.heading}
                </div>
                {visibleItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User info & logout */}
        <div className="p-4 border-t space-y-2">
          <div className="text-xs text-muted-foreground truncate">
            <span className="font-medium text-foreground">{displayName}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {user.roles.map((r) => r.name).join(", ")}
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b px-6 py-4 flex items-center justify-between bg-card">
          <h2 className="text-base font-semibold">Administration Portal</h2>
          <div className="text-xs text-muted-foreground">
            PostgreSQL · Prisma · RLS · Multi-Tenant
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
