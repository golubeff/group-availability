"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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

const statusLabel: Record<string, string> = {
  yes: "Yes",
  no: "No",
  if_must_be: "If must",
  available: "Available",
  inconvenient: "If must",
  unavailable: "Unavailable",
};

const statusDot: Record<string, string> = {
  yes: "bg-emerald-500",
  no: "bg-red-500",
  if_must_be: "bg-amber-500",
  available: "bg-emerald-500",
  inconvenient: "bg-amber-500",
  unavailable: "bg-red-500",
  "Not voted": "bg-gray-300",
  "Not set": "bg-gray-300",
};

interface TooltipInfo {
  dateStr: string;
  rect: DOMRect;
  type: string;
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
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
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

  function buildTooltip(dateStr: string, el: HTMLElement): TooltipInfo {
    const isBestFriday = Array.from(bestFridays.values()).includes(dateStr);
    const isMini = miniDates.has(dateStr);
    const isFull = fullDates.has(dateStr);
    const type = isBestFriday ? "Friday Meeting" : isMini ? "Mini Retreat" : "Full Retreat";
    const people: { name: string; status: string }[] = [];

    if (isBestFriday) {
      for (const p of participants) {
        const vote = monthlyVotes.find((v) => v.participantId === p.id && v.fridayDate === dateStr);
        people.push({ name: p.name, status: vote ? vote.vote : "Not voted" });
      }
    }
    if (isMini) {
      for (const p of participants) {
        const a = miniAvailability.find((x) => x.participantId === p.id && x.date === dateStr);
        people.push({ name: p.name, status: a?.status || "Not set" });
      }
    }
    if (isFull) {
      for (const p of participants) {
        const a = fullAvailability.find((x) => x.participantId === p.id && x.date === dateStr);
        people.push({ name: p.name, status: a?.status || "Not set" });
      }
    }

    return { dateStr, rect: el.getBoundingClientRect(), type, people };
  }

  useEffect(() => {
    if (!tooltip) return;
    const dismiss = () => setTooltip(null);
    window.addEventListener("scroll", dismiss, true);
    return () => window.removeEventListener("scroll", dismiss, true);
  }, [tooltip]);

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
        Hover (or tap) a highlighted date for details.
      </p>

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
                  <div key={i} className="text-[9px] text-muted-foreground">{d}</div>
                ))}
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isBestFriday = dateStr === bestFriday && !isRetreatMonth;
                  const isMini = miniDates.has(dateStr);
                  const isFull = fullDates.has(dateStr);
                  const isHighlighted = isBestFriday || isMini || isFull;

                  return (
                    <div
                      key={i}
                      onMouseEnter={(e) => isHighlighted && setTooltip(buildTooltip(dateStr, e.currentTarget))}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={(e) => isHighlighted && setTooltip(
                        tooltip?.dateStr === dateStr ? null : buildTooltip(dateStr, e.currentTarget)
                      )}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded text-[10px] transition-all",
                        isBestFriday && "bg-blue-500 text-white font-bold",
                        isMini && "bg-purple-500 text-white font-bold",
                        isFull && "bg-orange-500 text-white font-bold",
                        !isHighlighted && "text-muted-foreground",
                        isHighlighted && "cursor-pointer hover:opacity-80"
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

      {tooltip && <CalendarTooltip tooltip={tooltip} />}
    </div>
  );
}

function CalendarTooltip({ tooltip }: { tooltip: TooltipInfo }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const { dateStr, rect, type, people } = tooltip;
  const w = 190;
  let left = rect.left + rect.width / 2 - w / 2;
  if (left < 4) left = 4;
  if (left + w > window.innerWidth - 4) left = window.innerWidth - 4 - w;
  const showAbove = window.innerHeight - rect.bottom < 120;
  const top = showAbove ? undefined : rect.bottom + 6;
  const bottom = showAbove ? window.innerHeight - rect.top + 6 : undefined;

  const d = parseDate(dateStr);
  const dayN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return createPortal(
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-lg p-2 text-xs pointer-events-none animate-in fade-in-0 zoom-in-95 duration-75"
      style={{ left, top, bottom, width: w }}
    >
      <div className="font-medium mb-0.5">{dayN[d.getDay()]}, {monN[d.getMonth()]} {d.getDate()}</div>
      <div className="text-muted-foreground mb-1">{type}</div>
      <div className="space-y-0.5">
        {people.map((p) => (
          <div key={p.name} className="flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusDot[p.status] || "bg-gray-300")} />
            <span>{p.name}</span>
            <span className="text-muted-foreground ml-auto">{statusLabel[p.status] || p.status}</span>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

function getDateSet(range: { startDate: string; endDate: string } | null): Set<string> {
  if (!range) return new Set();
  const dates = new Set<string>();
  const d = parseDate(range.startDate);
  const end = parseDate(range.endDate);
  while (d <= end) {
    dates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}
