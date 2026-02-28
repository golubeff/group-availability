"use client";

import { useState } from "react";
import { parseDate, getAllFridaysPerMonth, getMonthKey } from "@/lib/dates";
import { scoreVotes, compareOptions } from "@/lib/scoring";
import type { Vote, Participant } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CombinedCalendarProps {
  monthlyVotes: { participantId: number; fridayDate: string; vote: string }[];
  miniRetreatBest: { startDate: string; endDate: string } | null;
  fullRetreatBest: { startDate: string; endDate: string } | null;
  participants: Participant[];
  miniAvailability: { participantId: number; date: string; status: string }[];
  fullAvailability: { participantId: number; date: string; status: string }[];
}

interface DateDetail {
  dateStr: string;
  type: "friday" | "mini" | "full";
  people: { name: string; status: string }[];
}

export function CombinedCalendar({
  monthlyVotes,
  miniRetreatBest,
  fullRetreatBest,
  participants,
  miniAvailability,
  fullAvailability,
}: CombinedCalendarProps) {
  const [selected, setSelected] = useState<DateDetail | null>(null);
  const months = getAllFridaysPerMonth();

  const bestFridays = new Map<string, string>();
  for (const monthData of months) {
    const fridayScores = monthData.fridays.map((f) => {
      const votes = monthlyVotes.filter((v) => v.fridayDate === f);
      const { score, noCount } = scoreVotes(votes.map((v) => v.vote as Vote));
      return { date: f, score, noCount, hasVotes: votes.length > 0 };
    });
    const best = fridayScores.filter((f) => f.hasVotes).sort((a, b) => compareOptions(a, b))[0];
    if (best) bestFridays.set(monthData.month, best.date);
  }

  const miniDates = getDateSet(miniRetreatBest);
  const fullDates = getDateSet(fullRetreatBest);
  const retreatMonths = new Set<string>();
  if (miniRetreatBest) retreatMonths.add(getMonthKey(miniRetreatBest.startDate));
  if (fullRetreatBest) retreatMonths.add(getMonthKey(fullRetreatBest.startDate));

  function getDateDetail(dateStr: string): DateDetail {
    const isBestFriday = Array.from(bestFridays.values()).includes(dateStr);
    const isMini = miniDates.has(dateStr);
    const isFull = fullDates.has(dateStr);
    const type = isBestFriday ? "friday" : isMini ? "mini" : "full";

    const people: { name: string; status: string }[] = [];

    if (isBestFriday) {
      for (const p of participants) {
        const vote = monthlyVotes.find(
          (v) => v.participantId === p.id && v.fridayDate === dateStr
        );
        const voteLabel = vote
          ? vote.vote === "yes" ? "Yes" : vote.vote === "no" ? "No" : "If must-be"
          : "Not voted";
        people.push({ name: p.name, status: voteLabel });
      }
    }

    if (isMini) {
      for (const p of participants) {
        const avail = miniAvailability.find(
          (a) => a.participantId === p.id && a.date === dateStr
        );
        people.push({ name: p.name, status: avail?.status || "available" });
      }
    }

    if (isFull) {
      for (const p of participants) {
        const avail = fullAvailability.find(
          (a) => a.participantId === p.id && a.date === dateStr
        );
        people.push({ name: p.name, status: avail?.status || "available" });
      }
    }

    return { dateStr, type, people };
  }

  function handleSelect(dateStr: string) {
    if (selected?.dateStr === dateStr) {
      setSelected(null);
    } else {
      setSelected(getDateDetail(dateStr));
    }
  }

  const typeLabels = { friday: "Friday Meeting", mini: "Mini Retreat", full: "Full Retreat" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Friday meeting</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span>Mini retreat</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>Full retreat</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Tap a highlighted date to see everyone&apos;s status.
      </p>

      {selected && (
        <div className="rounded-lg border p-3 bg-muted/50 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{formatFullDate(selected.dateStr)}</span>
              <span className="text-xs text-muted-foreground ml-2">{typeLabels[selected.type]}</span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-muted-foreground hover:text-foreground text-xs px-1"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
            {selected.people.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5 text-xs">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    p.status === "yes" || p.status === "available"
                      ? "bg-emerald-500"
                      : p.status === "no" || p.status === "unavailable"
                        ? "bg-red-500"
                        : p.status === "inconvenient" || p.status === "If must-be"
                          ? "bg-amber-500"
                          : "bg-gray-300"
                  )}
                />
                <span className="truncate">{p.name}</span>
                <span className="text-muted-foreground ml-auto flex-shrink-0">{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {months.map((monthData) => {
          const [year, month] = monthData.month.split("-").map(Number);
          const isRetreatMonth = retreatMonths.has(monthData.month);
          const bestFriday = bestFridays.get(monthData.month);
          const daysInMonth = new Date(year, month, 0).getDate();

          let startDow = new Date(year, month - 1, 1).getDay();
          startDow = startDow === 0 ? 6 : startDow - 1;

          const cells: (number | null)[] = [];
          for (let i = 0; i < startDow; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          while (cells.length % 7 !== 0) cells.push(null);

          return (
            <div key={monthData.month}>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-xs font-semibold">{monthData.label}</h4>
                {isRetreatMonth && (
                  <span className="text-[10px] text-muted-foreground">(retreat month)</span>
                )}
              </div>
              <div className="grid grid-cols-7 gap-[1px] text-center">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="text-[9px] text-muted-foreground">
                    {d}
                  </div>
                ))}
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isBestFriday = dateStr === bestFriday && !isRetreatMonth;
                  const isMini = miniDates.has(dateStr);
                  const isFull = fullDates.has(dateStr);
                  const isHighlighted = isBestFriday || isMini || isFull;
                  const isSelected = selected?.dateStr === dateStr;

                  return (
                    <div
                      key={i}
                      onClick={() => isHighlighted && handleSelect(dateStr)}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded text-[10px] transition-all",
                        isBestFriday && "bg-blue-500 text-white font-bold",
                        isMini && "bg-purple-500 text-white font-bold",
                        isFull && "bg-orange-500 text-white font-bold",
                        !isHighlighted && "text-muted-foreground",
                        isHighlighted && "cursor-pointer hover:opacity-80",
                        isSelected && "ring-2 ring-primary ring-offset-1"
                      )}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getDateSet(range: { startDate: string; endDate: string } | null): Set<string> {
  if (!range) return new Set();
  const dates = new Set<string>();
  const d = parseDate(range.startDate);
  const end = parseDate(range.endDate);
  while (d <= end) {
    dates.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function formatFullDate(dateStr: string): string {
  const d = parseDate(dateStr);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
