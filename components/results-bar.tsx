"use client";

import type { Vote } from "@/lib/types";

interface ResultsBarProps {
  votes: { vote: Vote }[];
  total: number;
}

export function ResultsBar({ votes, total }: ResultsBarProps) {
  if (total === 0) return null;

  const yes = votes.filter((v) => v.vote === "yes").length;
  const ifMust = votes.filter((v) => v.vote === "if_must_be").length;
  const no = votes.filter((v) => v.vote === "no").length;

  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
      {yes > 0 && (
        <div className="bg-emerald-500 h-full" style={{ width: `${(yes / total) * 100}%` }} />
      )}
      {ifMust > 0 && (
        <div className="bg-amber-400 h-full" style={{ width: `${(ifMust / total) * 100}%` }} />
      )}
      {no > 0 && (
        <div className="bg-red-500 h-full" style={{ width: `${(no / total) * 100}%` }} />
      )}
    </div>
  );
}
