"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Participant } from "@/lib/types";

interface ParticipantHeaderProps {
  participant: Participant;
  onSwitch: () => void;
  onOpenIcal: () => void;
  onDelete: () => void;
  isSaving?: boolean;
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

export function ParticipantHeader({ participant, onSwitch, onOpenIcal, onDelete, isSaving }: ParticipantHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasCal = !!participant.icalUrl;
  const syncTime = participant.icalLastSynced
    ? formatSyncTime(participant.icalLastSynced)
    : null;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-sm">
            {participant.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-sm">{participant.name}</span>
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="hidden sm:inline">Saving</span>
            </span>
          )}
        </button>
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

      {showMenu && (
        <div className="border-b bg-muted/30 px-4 py-3 space-y-2">
          <div className="text-sm font-medium">{participant.name}</div>
          {!confirmDelete ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => setConfirmDelete(true)}
            >
              Delete profile
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">Delete all your data?</span>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs h-7"
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
              >
                Yes, delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
