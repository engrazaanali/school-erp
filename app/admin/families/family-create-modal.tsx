"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FamilyCreateModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    familyCode: "",
    familyName: "",
    primaryContactName: "",
    primaryContactPhone: "",
    primaryContactEmail: "",
    city: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Failed to create family.");
        return;
      }

      setOpen(false);
      setFormData({
        familyCode: "",
        familyName: "",
        primaryContactName: "",
        primaryContactPhone: "",
        primaryContactEmail: "",
        city: "",
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
        + Create Family
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg border max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Register Family Household</h2>
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Family Code</label>
                  <Input
                    required
                    value={formData.familyCode}
                    onChange={(e) => setFormData({ ...formData, familyCode: e.target.value })}
                    placeholder="FAM-001"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Family Name</label>
                  <Input
                    required
                    value={formData.familyName}
                    onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                    placeholder="The Henderson Family"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Primary Contact</label>
                <Input
                  value={formData.primaryContactName}
                  onChange={(e) => setFormData({ ...formData, primaryContactName: e.target.value })}
                  placeholder="Parent Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Phone</label>
                  <Input
                    value={formData.primaryContactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, primaryContactPhone: e.target.value })
                    }
                    placeholder="+1-555-0100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Metropolis"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Saving…" : "Save Family"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
