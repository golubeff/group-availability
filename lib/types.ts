export type Vote = "yes" | "no" | "if_must_be";
export type AvailabilityStatus = "available" | "inconvenient" | "unavailable";
export type RetreatType = "mini" | "full";

export interface Participant {
  id: number;
  name: string;
  icalUrl?: string | null;
  icalLastSynced?: string | null;
}

export interface MonthlyVoteData {
  participantId: number;
  participantName: string;
  fridayDate: string;
  vote: Vote;
}

export interface FridayOption {
  date: string;
  votes: { participantId: number; participantName: string; vote: Vote }[];
  score: number;
  noCount: number;
  isBest: boolean;
  icalConflicts?: { participantId: number; title: string }[];
}

export interface MonthData {
  month: string; // "2026-06"
  label: string; // "June 2026"
  fridays: FridayOption[];
}

export interface RetreatAvailabilityData {
  participantId: number;
  date: string;
  status: AvailabilityStatus;
  source: "manual" | "ical";
}

export interface RetreatProposal {
  startDate: string;
  endDate: string;
  score: number;
  noCount: number;
  votes: { participantId: number; participantName: string; vote: Vote }[];
  availabilitySummary: {
    available: number;
    inconvenient: number;
    unavailable: number;
  };
}
