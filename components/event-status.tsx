"use client";

import type { Participant } from "@/lib/types";

interface EventStatusProps {
  type: "monthly" | "mini" | "full";
  participants: Participant[];
  votedParticipantIds: number[];
  bestOption: string | null;
  allAgreed: boolean;
}

export function EventStatus({
  type,
  participants,
  votedParticipantIds,
  bestOption,
  allAgreed,
}: EventStatusProps) {
  const total = participants.length;
  const uniqueVoters = new Set(votedParticipantIds);
  const voted = uniqueVoters.size;
  const notVoted = participants.filter((p) => !uniqueVoters.has(p.id));

  if (total === 0) {
    return (
      <div className="rounded-lg border border-dashed p-3 mb-4 text-sm text-muted-foreground">
        No participants yet.
      </div>
    );
  }

  const progress = total > 0 ? voted / total : 0;

  return (
    <div className="rounded-lg border p-3 mb-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allAgreed ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Confirmed
            </span>
          ) : voted === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              Waiting for votes
            </span>
          ) : voted < total ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Voting in progress
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Everyone voted
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {voted}/{total} voted on best option
        </span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            allAgreed
              ? "bg-emerald-500"
              : voted === total
                ? "bg-blue-500"
                : "bg-amber-500"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {notVoted.length > 0 && notVoted.length <= 6 && (
        <p className="text-xs text-muted-foreground">
          Waiting for: {notVoted.map((p) => p.name).join(", ")}
        </p>
      )}

      {bestOption && !allAgreed && (
        <p className="text-xs text-muted-foreground">
          Leading: <span className="font-medium text-foreground">{bestOption}</span>
        </p>
      )}

      {allAgreed && bestOption && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Confirmed: <span className="font-medium">{bestOption}</span>
        </p>
      )}
    </div>
  );
}
