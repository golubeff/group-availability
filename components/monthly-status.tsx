"use client";

import { getAllFridaysPerMonth, formatDateShort } from "@/lib/dates";
import { scoreVotes, compareOptions } from "@/lib/scoring";
import type { Vote, Participant } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MonthlyStatusProps {
  participants: Participant[];
  allVotes: { participantId: number; fridayDate: string; vote: string }[];
  retreatMonths: Set<string>;
}

export function MonthlyStatus({ participants, allVotes, retreatMonths }: MonthlyStatusProps) {
  const months = getAllFridaysPerMonth();
  const total = participants.length;

  if (total === 0) return null;

  const monthStatuses = months.map((m) => {
    const isRetreat = retreatMonths.has(m.month);
    const monthVotes = allVotes.filter((v) => m.fridays.includes(v.fridayDate));
    const voterIds = new Set(monthVotes.map((v) => v.participantId));
    const voted = voterIds.size;

    const fridayScores = m.fridays.map((f) => {
      const votes = allVotes.filter((v) => v.fridayDate === f);
      const { score, noCount } = scoreVotes(votes.map((v) => v.vote as Vote));
      return { date: f, score, noCount, votes, hasVotes: votes.length > 0 };
    });

    const best = fridayScores
      .filter((f) => f.hasVotes)
      .sort((a, b) => compareOptions(a, b))[0] || null;

    const bestVoterCount = best ? best.votes.length : 0;
    const everyoneVotedOnBest = best !== null && bestVoterCount >= total;
    const bestHasNoNo = best ? best.noCount === 0 : false;
    const isConfirmed = everyoneVotedOnBest && bestHasNoNo;

    return {
      month: m.month,
      label: m.label,
      isRetreat,
      voted,
      best,
      everyoneVotedOnBest,
      isConfirmed,
    };
  });

  const confirmed = monthStatuses.filter((m) => m.isConfirmed && !m.isRetreat).length;
  const inProgress = monthStatuses.filter((m) => !m.isConfirmed && !m.isRetreat && m.voted > 0).length;
  const notStarted = monthStatuses.filter((m) => m.voted === 0 && !m.isRetreat).length;

  return (
    <div className="rounded-lg border p-3 mb-4 space-y-3">
      <div className="flex items-center gap-3 text-xs flex-wrap">
        {confirmed > 0 && (
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {confirmed} confirmed
          </span>
        )}
        {inProgress > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {inProgress} in progress
          </span>
        )}
        {notStarted > 0 && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
            {notStarted} not started
          </span>
        )}
      </div>

      <div className="space-y-1">
        {monthStatuses.map((m) => {
          if (m.isRetreat) {
            return (
              <div key={m.month} className="flex items-center gap-2 text-xs py-0.5 text-muted-foreground">
                <span className="w-20 flex-shrink-0 font-medium">{m.label.split(" ")[0]}</span>
                <span className="italic">Retreat month</span>
              </div>
            );
          }

          return (
            <div key={m.month} className="flex items-center gap-2 text-xs py-0.5">
              <span className="w-20 flex-shrink-0 font-medium">{m.label.split(" ")[0]}</span>
              <span
                className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  m.isConfirmed
                    ? "bg-emerald-500"
                    : m.voted > 0
                      ? "bg-amber-500"
                      : "bg-gray-300 dark:bg-gray-600"
                )}
              />
              {m.best ? (
                <span className={m.isConfirmed ? "text-emerald-700 dark:text-emerald-400 font-medium" : ""}>
                  {formatDateShort(m.best.date)}
                  {m.best.noCount > 0 && (
                    <span className="text-red-500 ml-1">({m.best.noCount} No)</span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">No votes yet</span>
              )}
              <span className="text-muted-foreground ml-auto">
                {m.voted}/{total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
