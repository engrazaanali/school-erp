"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function InquiryCreateModal({ campuses }: { campuses: Array<{ id: string; name: string; code: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    campusId: campuses[0]?.id || "",
    studentFirstName: "",
    studentLastName: "",
    gradeApplying: "Grade 1",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    source: "WALK_IN" as const,
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admissions/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to log admission inquiry.");
        return;
      }

      setOpen(false);
      setFormData({
        campusId: campuses[0]?.id || "",
        studentFirstName: "",
        studentLastName: "",
        gradeApplying: "Grade 1",
        parentName: "",
        parentPhone: "",
        parentEmail: "",
        source: "WALK_IN",
        notes: "",
      });
      router.refresh();
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        + New Admission Inquiry
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg border max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">New Admission Inquiry</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs rounded bg-destructive/10 text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium">Campus</label>
                <select
                  required
                  value={formData.campusId}
                  onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Applicant First Name</label>
                  <Input
                    required
                    value={formData.studentFirstName}
                    onChange={(e) =>
                      setFormData({ ...formData, studentFirstName: e.target.value })
                    }
                    placeholder="Michael"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Applicant Last Name</label>
                  <Input
                    required
                    value={formData.studentLastName}
                    onChange={(e) =>
                      setFormData({ ...formData, studentLastName: e.target.value })
                    }
                    placeholder="Brown"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Grade Applying For</label>
                <Input
                  required
                  value={formData.gradeApplying}
                  onChange={(e) => setFormData({ ...formData, gradeApplying: e.target.value })}
                  placeholder="e.g. Grade 1 / Kindergarten"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Parent / Guardian</label>
                  <Input
                    required
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    placeholder="Parent Full Name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Contact Phone</label>
                  <Input
                    required
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    placeholder="+1-555-0155"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Inquiry Source</label>
                <select
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value as any })
                  }
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                >
                  <option value="WALK_IN">Walk-in Visit</option>
                  <option value="WEBSITE">Website Portal</option>
                  <option value="REFERRAL">Referral / Word of Mouth</option>
                  <option value="SOCIAL_MEDIA">Social Media</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Logging…" : "Record Inquiry"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
