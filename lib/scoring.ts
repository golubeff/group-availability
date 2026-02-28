import type { Vote } from "./types";

const VOTE_SCORES: Record<Vote, number> = {
  yes: 2,
  if_must_be: 1,
  no: 0,
};

export function scoreVotes(votes: Vote[]): { score: number; noCount: number } {
  let score = 0;
  let noCount = 0;
  for (const v of votes) {
    score += VOTE_SCORES[v];
    if (v === "no") noCount++;
  }
  return { score, noCount };
}

export function compareOptions(
  a: { score: number; noCount: number },
  b: { score: number; noCount: number }
): number {
  if (a.noCount !== b.noCount) return a.noCount - b.noCount;
  return b.score - a.score;
}
