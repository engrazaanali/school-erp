import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-gradient-to-b from-background to-secondary/20">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <Badge variant="outline" className="text-sm px-3 py-1 border-primary/40 text-primary">
            Phase 0 Complete: Architecture & Project Scaffolding
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Multi-Tenant School ERP SaaS
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Modular monolith with strict server-side multi-tenancy, Row-Level Security,
            granular RBAC, and zero-trust authorization pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Multi-Tenancy</CardTitle>
              <CardDescription>
                PostgreSQL shared-schema architecture with defense-in-depth RLS.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Isolated organization and campus data with server-side tenant resolution.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security & RBAC</CardTitle>
              <CardDescription>
                Strict authorization pipeline and sanitized error handling.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Role + Permission + Scope hierarchy without client-side trust.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Health & Logging</CardTitle>
              <CardDescription>
                Structured JSON logger with automated credential redaction.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Standardized `/api/health` monitoring and operational telemetry.
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Button asChild>
            <Link href="/api/health" target="_blank">
              Test Health Endpoint (/api/health)
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">
              Auth Preview (/login)
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
