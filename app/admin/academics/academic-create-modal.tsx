"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AcademicCreateModal({ campuses }: { campuses: Array<{ id: string; name: string; code: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"year" | "class" | "subject">("year");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Year Form
  const [yearData, setYearData] = useState({
    campusId: campuses[0]?.id || "",
    name: "2026-2027",
    code: "AY-26-27",
    isCurrent: true,
  });

  // Class Form
  const [classData, setClassData] = useState({
    campusId: campuses[0]?.id || "",
    name: "Grade 1",
    code: "G1",
    stage: "PRIMARY" as const,
    order: 1,
  });

  // Subject Form
  const [subjectData, setSubjectData] = useState({
    campusId: campuses[0]?.id || "",
    name: "Mathematics",
    code: "MATH-01",
    type: "THEORY" as const,
  });

  async function handleCreateYear(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/academics/years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(yearData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to create academic year.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/academics/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to create class.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/academics/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to create subject.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        + Configure Structure
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg border max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Academic Configuration</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b text-xs">
              <button
                type="button"
                className={`py-2 px-3 border-b-2 font-medium ${
                  activeTab === "year" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                }`}
                onClick={() => setActiveTab("year")}
              >
                Academic Year
              </button>
              <button
                type="button"
                className={`py-2 px-3 border-b-2 font-medium ${
                  activeTab === "class" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                }`}
                onClick={() => setActiveTab("class")}
              >
                Class / Grade
              </button>
              <button
                type="button"
                className={`py-2 px-3 border-b-2 font-medium ${
                  activeTab === "subject" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                }`}
                onClick={() => setActiveTab("subject")}
              >
                Subject
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs rounded bg-destructive/10 text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            {/* TAB 1: ACADEMIC YEAR */}
            {activeTab === "year" && (
              <form onSubmit={handleCreateYear} className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Campus</label>
                  <select
                    required
                    value={yearData.campusId}
                    onChange={(e) => setYearData({ ...yearData, campusId: e.target.value })}
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
                    <label className="text-xs font-medium">Session Name</label>
                    <Input
                      required
                      value={yearData.name}
                      onChange={(e) => setYearData({ ...yearData, name: e.target.value })}
                      placeholder="2026-2027"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Code</label>
                    <Input
                      required
                      value={yearData.code}
                      onChange={(e) => setYearData({ ...yearData, code: e.target.value })}
                      placeholder="AY-26-27"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isCurrent"
                    checked={yearData.isCurrent}
                    onChange={(e) => setYearData({ ...yearData, isCurrent: e.target.checked })}
                  />
                  <label htmlFor="isCurrent" className="text-xs font-medium">
                    Mark as Current Active Session
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={loading}>
                    {loading ? "Saving…" : "Save Session"}
                  </Button>
                </div>
              </form>
            )}

            {/* TAB 2: CLASS */}
            {activeTab === "class" && (
              <form onSubmit={handleCreateClass} className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Campus</label>
                  <select
                    required
                    value={classData.campusId}
                    onChange={(e) => setClassData({ ...classData, campusId: e.target.value })}
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
                    <label className="text-xs font-medium">Class Name</label>
                    <Input
                      required
                      value={classData.name}
                      onChange={(e) => setClassData({ ...classData, name: e.target.value })}
                      placeholder="Grade 1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Class Code</label>
                    <Input
                      required
                      value={classData.code}
                      onChange={(e) => setClassData({ ...classData, code: e.target.value })}
                      placeholder="G1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">Academic Stage</label>
                  <select
                    value={classData.stage}
                    onChange={(e) => setClassData({ ...classData, stage: e.target.value as any })}
                    className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                  >
                    <option value="PRIMARY">Primary School</option>
                    <option value="MIDDLE">Middle School</option>
                    <option value="SECONDARY">Secondary / High School</option>
                    <option value="HIGHER_SECONDARY">Higher Secondary</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={loading}>
                    {loading ? "Saving…" : "Save Class"}
                  </Button>
                </div>
              </form>
            )}

            {/* TAB 3: SUBJECT */}
            {activeTab === "subject" && (
              <form onSubmit={handleCreateSubject} className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Campus</label>
                  <select
                    required
                    value={subjectData.campusId}
                    onChange={(e) => setSubjectData({ ...subjectData, campusId: e.target.value })}
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
                    <label className="text-xs font-medium">Subject Name</label>
                    <Input
                      required
                      value={subjectData.name}
                      onChange={(e) => setSubjectData({ ...subjectData, name: e.target.value })}
                      placeholder="Science"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Subject Code</label>
                    <Input
                      required
                      value={subjectData.code}
                      onChange={(e) => setSubjectData({ ...subjectData, code: e.target.value })}
                      placeholder="SCI-01"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={loading}>
                    {loading ? "Saving…" : "Save Subject"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
