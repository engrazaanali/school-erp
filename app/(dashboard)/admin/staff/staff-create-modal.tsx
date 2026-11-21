"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StaffCreateModal({ campuses }: { campuses: Array<{ id: string; name: string; code: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    campusId: campuses[0]?.id || "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    employeeNumber: "",
    designation: "Teacher",
    department: "Academics",
    isTeacher: true,
    specialization: "General",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to create staff member.");
        return;
      }

      setOpen(false);
      setFormData({
        campusId: campuses[0]?.id || "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        employeeNumber: "",
        designation: "Teacher",
        department: "Academics",
        isTeacher: true,
        specialization: "General",
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
        + Add Staff Member
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg border max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Staff / Faculty</h2>
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
                  <label className="text-xs font-medium">First Name</label>
                  <Input
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Robert"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Last Name</label>
                  <Input
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Email Address</label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rsmith@school.edu"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Employee #</label>
                  <Input
                    required
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                    placeholder="EMP-102"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Designation</label>
                  <Input
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="Senior Mathematics Teacher"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Department</label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Mathematics"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isTeacher"
                  checked={formData.isTeacher}
                  onChange={(e) => setFormData({ ...formData, isTeacher: e.target.checked })}
                  className="rounded border"
                />
                <label htmlFor="isTeacher" className="text-xs font-medium cursor-pointer">
                  Assign as Faculty / Teaching Staff
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Saving…" : "Save Staff"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
