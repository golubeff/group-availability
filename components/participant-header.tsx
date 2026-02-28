"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { Participant } from "@/lib/types";

interface ParticipantHeaderProps {
  participant: Participant;
  onSwitch: () => void;
  onOpenIcal: () => void;
  onDelete: () => void;
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

interface BackupEntry {
  id: number;
  createdAt: string;
  dataHash: string;
}

export function ParticipantHeader({ participant, onSwitch, onOpenIcal, onDelete }: ParticipantHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  const [backupsList, setBackupsList] = useState<BackupEntry[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);

  const hasCal = !!participant.icalUrl;
  const syncTime = participant.icalLastSynced
    ? formatSyncTime(participant.icalLastSynced)
    : null;

  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch("/api/backup");
      setBackupsList(await res.json());
    } catch { /* ignore */ }
    setLoadingBackups(false);
  };

  const handleRestore = async (backupId: number) => {
    setRestoring(backupId);
    try {
      await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", backupId }),
      });
      window.location.reload();
    } catch {
      setRestoring(null);
    }
  };

  useEffect(() => {
    if (showBackups) loadBackups();
  }, [showBackups]);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
        <button
          onClick={() => { setShowMenu(!showMenu); setShowBackups(false); }}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-sm">
            {participant.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-sm">{participant.name}</span>
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
        <div className="border-b bg-muted/30 px-4 py-3 space-y-3">
          <div className="text-sm font-medium">{participant.name}</div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowBackups(!showBackups)}
            >
              {showBackups ? "Hide backups" : "Backups"}
            </Button>

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

          {showBackups && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Automatic snapshots (every 10 min when changes occur). Restore rolls back ALL data for ALL users.
              </div>
              {loadingBackups ? (
                <div className="text-xs text-muted-foreground">Loading...</div>
              ) : backupsList.length === 0 ? (
                <div className="text-xs text-muted-foreground">No backups yet.</div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {backupsList.map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-xs py-1 border-b border-border/30">
                      <span className="text-muted-foreground">
                        {new Date(b.createdAt).toLocaleString()}
                      </span>
                      {confirmRestore === b.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-[10px] h-6 px-2"
                            disabled={restoring !== null}
                            onClick={() => handleRestore(b.id)}
                          >
                            {restoring === b.id ? "Restoring..." : "Confirm"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-6 px-2"
                            onClick={() => setConfirmRestore(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-6 px-2"
                          onClick={() => setConfirmRestore(b.id)}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
