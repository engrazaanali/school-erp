import { requireServerSession } from "@/server/auth/session";
import { AdmissionRepository } from "@/server/repositories/admission.repository";
import { CampusRepository } from "@/server/repositories/campus.repository";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import InquiryCreateModal from "./inquiry-create-modal";

export const dynamic = "force-dynamic";

export default async function AdmissionsPage() {
  const user = await requireServerSession();

  let inquiries: any[] = [];
  let campuses: any[] = [];

  try {
    const [inquiriesResult, campusesList] = await Promise.all([
      AdmissionRepository.listInquiries(user.organizationId, {
        campusId: user.primaryCampusId,
        limit: 50,
      }),
      CampusRepository.list(user.organizationId),
    ]);
    inquiries = inquiriesResult.items;
    campuses = campusesList.items;
  } catch {
    // Graceful fallback
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "INQUIRY":
        return <Badge variant="outline">New Inquiry</Badge>;
      case "CONTACTED":
        return <Badge variant="secondary">Contacted</Badge>;
      case "ADMITTED":
        return <Badge variant="default" className="bg-emerald-600">Admitted</Badge>;
      case "REJECTED":
      case "CANCELLED":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admissions & Inquiries</h1>
          <p className="text-sm text-muted-foreground">
            Track prospective student inquiries, followups, and admission conversions.
          </p>
        </div>
        <InquiryCreateModal campuses={campuses} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {inquiries.length === 0 ? (
          <Card className="border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-sm">No admission inquiries registered yet.</p>
            <p className="text-xs mt-1">Use the New Inquiry button above to log prospective students.</p>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase border-b">
                <tr>
                  <th className="px-4 py-3">Inquiry #</th>
                  <th className="px-4 py-3">Applicant Student</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Parent Contact</th>
                  <th className="px-4 py-3">Campus</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inquiries.map((inq) => (
                  <tr key={inq.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{inq.inquiryNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {inq.studentFirstName} {inq.studentLastName}
                      </div>
                      {inq.source && (
                        <div className="text-[10px] text-muted-foreground uppercase">
                          Via: {inq.source}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-xs">
                      {inq.gradeApplying}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium">{inq.parentName}</div>
                      <div className="text-muted-foreground font-mono">{inq.parentPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {inq.campus.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(inq.status)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(inq.createdAt).toLocaleDateString()}
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
