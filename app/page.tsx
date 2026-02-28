"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Participant } from "@/lib/types";

export default function Home() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingParticipants, setExistingParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("participant");
    if (stored) {
      window.location.href = "/dashboard";
      return;
    }
    setChecking(false);
    fetch("/api/participants")
      .then((r) => r.json())
      .then((data) => setExistingParticipants(data))
      .catch(() => {});
  }, []);

  const loginAs = async (participant: Participant) => {
    setLoading(true);
    localStorage.setItem("participant", JSON.stringify(participant));
    window.location.href = "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const participant = await res.json();
      localStorage.setItem("participant", JSON.stringify(participant));
      window.location.href = "/dashboard";
    } catch {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Group Availability</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Coordinate monthly meetings and retreats
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {existingParticipants.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">Continue as:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {existingParticipants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loginAs(p)}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors text-sm disabled:opacity-50"
                  >
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-xs">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {existingParticipants.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">or join as new</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoFocus={existingParticipants.length === 0}
              className="text-center"
            />
            <Button type="submit" className="w-full" disabled={!name.trim() || loading}>
              {loading ? "Joining..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
