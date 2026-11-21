"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  classes: any[];
  students: any[];
  academicYearId: string;
  campusId: string;
}

export default function AttendanceSheet({ classes, students, academicYearId, campusId }: Props) {
  const router = useRouter();

  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || "");
  const currentClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const [selectedSectionId, setSelectedSectionId] = useState(currentClass?.sections[0]?.id || "");
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);

  // Map of studentId -> status ("PRESENT" | "ABSENT" | "LATE" | "LEAVE")
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "PRESENT" | "ABSENT" | "LATE" | "LEAVE">>(() => {
    const init: Record<string, "PRESENT" | "ABSENT" | "LATE" | "LEAVE"> = {};
    students.forEach((s) => {
      init[s.id] = "PRESENT";
    });
    return init;
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  function setAll(status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE") {
    const updated: Record<string, "PRESENT" | "ABSENT" | "LATE" | "LEAVE"> = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
  }

  function handleStatusChange(studentId: string, status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE") {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  }

  async function handleSubmit() {
    setLoading(true);
    setMessage(null);

    const records = students.map((s) => ({
      studentId: s.id,
      status: attendanceMap[s.id] || "PRESENT",
    }));

    try {
      const res = await fetch("/api/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campusId,
          academicYearId,
          classId: selectedClassId,
          sectionId: selectedSectionId || currentClass?.sections[0]?.id || "default",
          date: dateStr,
          records,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ text: data?.error?.message || "Failed to submit attendance.", type: "error" });
        return;
      }

      const absentCount = records.filter((r) => r.status === "ABSENT").length;
      setMessage({
        text: `Attendance saved successfully! (${records.length} pupils marked, ${absentCount} absent events emitted).`,
        type: "success",
      });
      router.refresh();
    } catch {
      setMessage({ text: "Network error occurred.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  const absentTotal = Object.values(attendanceMap).filter((s) => s === "ABSENT").length;

  return (
    <div className="space-y-6">
      {/* Control bar */}
      <Card className="border shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs font-medium">Class / Grade</label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  const cls = classes.find((c) => c.id === e.target.value);
                  if (cls?.sections[0]) setSelectedSectionId(cls.sections[0].id);
                }}
                className="w-full h-9 rounded-md border bg-background px-3 text-xs mt-1"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium">Section</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-3 text-xs mt-1"
              >
                {currentClass?.sections.map((sec: any) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium">Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-3 text-xs mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAll("PRESENT")}>
                Mark All Present
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {message && (
        <div
          className={`p-3 text-xs rounded border ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Roster & marking table */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Class Roster</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {students.length} pupil(s) enrolled • {absentTotal} marked absent
            </p>
          </div>
          {absentTotal > 0 && (
            <Badge variant="destructive" className="text-xs">
              ⚠️ {absentTotal} Absent Notification(s) will trigger
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No students enrolled in this section.
            </div>
          ) : (
            <div className="divide-y border rounded-md">
              {students.map((student) => {
                const currentStatus = attendanceMap[student.id] || "PRESENT";

                return (
                  <div
                    key={student.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30"
                  >
                    <div>
                      <span className="font-mono text-xs text-muted-foreground mr-2">
                        {student.admissionNumber}
                      </span>
                      <span className="font-medium text-sm">
                        {student.person.firstName} {student.person.lastName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, "PRESENT")}
                        className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                          currentStatus === "PRESENT"
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, "ABSENT")}
                        className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                          currentStatus === "ABSENT"
                            ? "bg-red-600 text-white font-bold"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, "LATE")}
                        className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                          currentStatus === "LATE"
                            ? "bg-amber-500 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        Late
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, "LEAVE")}
                        className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                          currentStatus === "LEAVE"
                            ? "bg-blue-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSubmit} disabled={loading || students.length === 0}>
              {loading ? "Submitting..." : "Submit Daily Attendance"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
