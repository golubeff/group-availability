"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoteButton, VoteSummary } from "@/components/vote-button";
import { ResultsBar } from "@/components/results-bar";
import { formatDateRange } from "@/lib/dates";
import type { Vote, RetreatProposal, RetreatType, Participant } from "@/lib/types";

interface RetreatVote {
  participantId: number;
  retreatType: string;
  startDate: string;
  vote: string;
}

interface RetreatProposalsProps {
  participant: Participant;
  retreatType: RetreatType;
  proposals: RetreatProposal[];
  allVotes: RetreatVote[];
  participants: Participant[];
  onVote: (startDate: string, endDate: string, vote: Vote | null) => void;
}

export function RetreatProposals({
  participant,
  retreatType,
  proposals,
  allVotes,
  participants,
  onVote,
}: RetreatProposalsProps) {
  if (proposals.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 text-sm">
        Fill in your availability above so the system can suggest the best dates.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        Top {proposals.length} periods (by group availability)
      </h3>
      {proposals.map((proposal, idx) => {
        const myVote = allVotes.find(
          (v) =>
            v.participantId === participant.id &&
            v.retreatType === retreatType &&
            v.startDate === proposal.startDate
        );
        const proposalVotes = allVotes.filter(
          (v) => v.retreatType === retreatType && v.startDate === proposal.startDate
        );

        return (
          <Card
            key={proposal.startDate}
            className={idx === 0 ? "ring-1 ring-emerald-300 dark:ring-emerald-700" : ""}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {formatDateRange(proposal.startDate, proposal.endDate)}
                    </span>
                    {idx === 0 && (
                      <Badge variant="default" className="text-[10px] px-1 py-0 h-4 bg-emerald-600">
                        Best
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground mb-1">
                    <span className="text-emerald-600">
                      {proposal.availabilitySummary.available} available
                    </span>
                    <span className="text-amber-600">
                      {proposal.availabilitySummary.inconvenient} if must
                    </span>
                    <span className="text-red-600">
                      {proposal.availabilitySummary.unavailable} unavail
                    </span>
                  </div>
                  <VoteSummary
                    votes={proposalVotes.map((v) => ({ vote: v.vote as Vote }))}
                    total={participants.length}
                  />
                  <ResultsBar
                    votes={proposalVotes.map((v) => ({ vote: v.vote as Vote }))}
                    total={participants.length}
                  />
                </div>
                <VoteButton
                  currentVote={(myVote?.vote as Vote) || null}
                  onVote={(v) => onVote(proposal.startDate, proposal.endDate, v)}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
