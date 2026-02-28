"use client";

import { Button } from "@/components/ui/button";
import type { Participant } from "@/lib/types";

interface ParticipantHeaderProps {
  participant: Participant;
  onSwitch: () => void;
  onOpenIcal: () => void;
}

function formatSyncTime(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export function ParticipantHeader({ participant, onSwitch, onOpenIcal }: ParticipantHeaderProps) {
  const hasCal = !!participant.icalUrl;
  const syncTime = participant.icalLastSynced
    ? formatSyncTime(participant.icalLastSynced)
    : null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-sm">
          {participant.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-sm">{participant.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onOpenIcal} className="text-xs gap-1.5">
          {hasCal ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="hidden sm:inline">Synced {syncTime}</span>
              <span className="sm:hidden">Cal</span>
            </>
          ) : (
            "Link calendar"
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={onSwitch} className="text-xs">
          Switch
        </Button>
      </div>
    </div>
  );
}
