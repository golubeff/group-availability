"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Vote } from "@/lib/types";

const voteConfig: Record<Vote, { label: string; className: string }> = {
  yes: { label: "Yes", className: "bg-emerald-500 text-white hover:bg-emerald-600" },
  no: { label: "No", className: "bg-red-500 text-white hover:bg-red-600" },
  if_must_be: { label: "If must", className: "bg-amber-400 text-black hover:bg-amber-500" },
};

const cycleOrder: (Vote | null)[] = ["yes", "if_must_be", "no", null];

interface VoteButtonProps {
  currentVote: Vote | null;
  onVote: (vote: Vote | null) => void;
  size?: "sm" | "md";
}

export function VoteButton({ currentVote, onVote, size = "md" }: VoteButtonProps) {
  const [saving, setSaving] = useState(false);

  const handleClick = async () => {
    const currentIdx = cycleOrder.indexOf(currentVote);
    const nextIdx = (currentIdx + 1) % cycleOrder.length;
    setSaving(true);
    onVote(cycleOrder[nextIdx]);
    setTimeout(() => setSaving(false), 600);
  };

  const config = currentVote ? voteConfig[currentVote] : null;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative rounded-md font-medium transition-all select-none touch-manipulation active:scale-90 overflow-hidden",
        size === "sm" ? "px-2 py-1 text-xs min-h-[32px]" : "px-3 py-1.5 text-sm min-h-[44px]",
        config
          ? config.className
          : "bg-muted text-muted-foreground hover:bg-muted/80 border border-dashed border-border"
      )}
    >
      {config ? config.label : "—"}
      {saving && (
        <span className="absolute inset-0 flex items-center justify-center bg-inherit">
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </span>
      )}
    </button>
  );
}

interface VoteSummaryProps {
  votes: { vote: Vote }[];
  total: number;
}

export function VoteSummary({ votes, total }: VoteSummaryProps) {
  const yes = votes.filter((v) => v.vote === "yes").length;
  const ifMust = votes.filter((v) => v.vote === "if_must_be").length;
  const no = votes.filter((v) => v.vote === "no").length;
  const pending = total - votes.length;

  if (votes.length === 0) return null;

  return (
    <div className="flex gap-1 items-center text-xs">
      {yes > 0 && <span className="text-emerald-600 font-medium">{yes}✓</span>}
      {ifMust > 0 && <span className="text-amber-600 font-medium">{ifMust}~</span>}
      {no > 0 && <span className="text-red-600 font-medium">{no}✗</span>}
      {pending > 0 && <span className="text-muted-foreground">{pending}?</span>}
    </div>
  );
}
