"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Participant } from "@/lib/types";

interface IcalSettingsProps {
  participant: Participant;
  onSave: (url: string) => Promise<void>;
  onClose: () => void;
}

export function IcalSettings({ participant, onSave, onClose }: IcalSettingsProps) {
  const [url, setUrl] = useState(participant.icalUrl || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await onSave(url);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sync calendar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <Card className="w-full sm:max-w-lg rounded-b-none sm:rounded-b-xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Calendar Sync</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste your calendar&apos;s iCal URL to automatically detect conflicts. Your events will
            be shown as warnings on Fridays and pre-fill retreat availability.
          </p>

          <div className="space-y-3 text-xs text-muted-foreground">
            <details>
              <summary className="cursor-pointer font-medium text-foreground">
                Google Calendar
              </summary>
              <p className="mt-1 pl-3">
                Settings → Select calendar → &quot;Secret address in iCal format&quot; → Copy the URL
              </p>
            </details>
            <details>
              <summary className="cursor-pointer font-medium text-foreground">
                Outlook / Office 365
              </summary>
              <p className="mt-1 pl-3">
                Settings → Calendar → Shared calendars → Publish a calendar → ICS link
              </p>
            </details>
            <details>
              <summary className="cursor-pointer font-medium text-foreground">
                Apple Calendar (iCloud)
              </summary>
              <p className="mt-1 pl-3">
                iCloud.com → Calendar → Share icon → Public Calendar → Copy link
              </p>
            </details>
          </div>

          <div className="space-y-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/..."
              className="text-sm"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            {success && (
              <p className="text-xs text-emerald-500">Calendar synced successfully!</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1" size="sm">
              {loading ? "Syncing..." : url ? "Save & Sync" : "Remove Calendar"}
            </Button>
            <Button variant="outline" onClick={onClose} size="sm">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
