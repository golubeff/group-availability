"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoteButton, VoteSummary } from "@/components/vote-button";
import { ResultsBar } from "@/components/results-bar";
import { getAllFridaysPerMonth, formatDateShort } from "@/lib/dates";
import { scoreVotes, compareOptions } from "@/lib/scoring";
import type { Vote, Participant } from "@/lib/types";

interface FridayVote {
  participantId: number;
  fridayDate: string;
  vote: string;
}

interface IcalEvent {
  date: string;
  title: string;
  allDay: string;
  startTime?: string | null;
  endTime?: string | null;
}

interface FridayGridProps {
  participant: Participant;
  allVotes: FridayVote[];
  participants: Participant[];
  icalEvents: IcalEvent[];
  onVote: (fridayDate: string, vote: Vote | null) => void;
  retreatMonths?: Set<string>;
  onReset?: () => void;
}

export function FridayGrid({
  participant,
  allVotes,
  participants,
  icalEvents,
  onVote,
  retreatMonths,
  onReset,
}: FridayGridProps) {
  // Local overrides for instant UI feedback
  const [localVotes, setLocalVotes] = useState<Map<string, Vote | null>>(new Map());

  // Clear overrides when server data catches up
  useEffect(() => {
    if (localVotes.size === 0) return;
    setLocalVotes((prev) => {
      const next = new Map(prev);
      let changed = false;
      for (const [date, vote] of prev) {
        const serverVote = allVotes.find(
          (v) => v.participantId === participant.id && v.fridayDate === date
        );
        const serverVal = serverVote ? serverVote.vote : null;
        if (serverVal === vote) {
          next.delete(date);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [allVotes]);

  const handleVote = useCallback(
    (fridayDate: string, vote: Vote | null) => {
      setLocalVotes((prev) => new Map(prev).set(fridayDate, vote));
      onVote(fridayDate, vote);
    },
    [onVote]
  );

  function getMyVote(fridayDate: string): Vote | null {
    if (localVotes.has(fridayDate)) return localVotes.get(fridayDate)!;
    const v = allVotes.find(
      (v) => v.participantId === participant.id && v.fridayDate === fridayDate
    );
    return v ? (v.vote as Vote) : null;
  }

  const months = getAllFridaysPerMonth();
  const hasMyVotes =
    allVotes.some((v) => v.participantId === participant.id) || localVotes.size > 0;

  const handleReset = useCallback(() => {
    setLocalVotes(new Map());
    onReset?.();
  }, [onReset]);

  return (
    <div className="space-y-4">
      {hasMyVotes && onReset && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleReset}>
            Reset all
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {months.map((monthData) => {
        const isRetreatMonth = retreatMonths?.has(monthData.month);

        const fridayScores = monthData.fridays.map((friday) => {
          const fridayVotes = allVotes.filter((v) => v.fridayDate === friday);
          const myVote = getMyVote(friday);
          const { score, noCount } = scoreVotes(fridayVotes.map((v) => v.vote as Vote));
          const conflict = checkFridayIcalConflict(icalEvents, friday);
          return { date: friday, votes: fridayVotes, myVote, score, noCount, conflict };
        });

        const best = [...fridayScores]
          .filter((f) => f.votes.length > 0)
          .sort((a, b) => compareOptions(a, b))[0];

        return (
          <Card key={monthData.month} className={isRetreatMonth ? "opacity-60" : ""}>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{monthData.label}</CardTitle>
                {isRetreatMonth && (
                  <Badge variant="secondary" className="text-xs">
                    Retreat month
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {fridayScores.map((friday) => (
                  <div
                    key={friday.date}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      best?.date === friday.date && !isRetreatMonth
                        ? "bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-200 dark:ring-emerald-800"
                        : "bg-muted/30"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{formatDateShort(friday.date)}</span>
                        {friday.conflict && (
                          <span
                            className="text-amber-500 text-xs cursor-help"
                            title={`Calendar conflict: ${friday.conflict}`}
                          >
                            ⚠
                          </span>
                        )}
                        {best?.date === friday.date && !isRetreatMonth && (
                          <Badge variant="default" className="text-[10px] px-1 py-0 h-4 bg-emerald-600">
                            Best
                          </Badge>
                        )}
                      </div>
                      <VoteSummary
                        votes={friday.votes.map((v) => ({ vote: v.vote as Vote }))}
                        total={participants.length}
                      />
                      <ResultsBar
                        votes={friday.votes.map((v) => ({ vote: v.vote as Vote }))}
                        total={participants.length}
                      />
                    </div>
                    <VoteButton
                      currentVote={friday.myVote}
                      onVote={(v) => handleVote(friday.date, v)}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}

function checkFridayIcalConflict(events: IcalEvent[], fridayDate: string): string | null {
  const dayEvents = events.filter((e) => e.date === fridayDate);
  for (const ev of dayEvents) {
    if (ev.allDay === "true") return ev.title || "Busy";
    if (ev.startTime && ev.endTime) {
      const [sh, sm] = ev.startTime.split(":").map(Number);
      const [eh, em] = ev.endTime.split(":").map(Number);
      const evStart = sh * 60 + sm;
      const evEnd = eh * 60 + em;
      if (evStart < 15 * 60 && evEnd > 11 * 60) {
        return ev.title || "Busy";
      }
    }
  }
  return null;
}
