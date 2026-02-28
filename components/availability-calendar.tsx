"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { parseDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import type { AvailabilityStatus, RetreatType, Participant } from "@/lib/types";

interface AvailabilityEntry {
  participantId: number;
  retreatType: string;
  date: string;
  status: string;
  source: string;
}

interface AvailabilityCalendarProps {
  participant: Participant;
  retreatType: RetreatType;
  allAvailability: AvailabilityEntry[];
  participants: Participant[];
  dates: string[];
  onSetStatus: (date: string, status: string) => void;
  onPaintEnd?: () => void;
  onReset?: () => void;
}

type CellStatus = "not_set" | "available" | "inconvenient" | "unavailable";

const cellBg: Record<CellStatus, string> = {
  not_set: "bg-white dark:bg-muted/20",
  available: "bg-emerald-200 dark:bg-emerald-800/40",
  inconvenient: "bg-amber-200 dark:bg-amber-800/40",
  unavailable: "bg-red-200 dark:bg-red-800/40",
};

const statusLabels: Record<CellStatus, string> = {
  not_set: "Not set",
  available: "Available",
  inconvenient: "If must",
  unavailable: "Unavailable",
};

const dotBg: Record<CellStatus, string> = {
  not_set: "bg-gray-300",
  available: "bg-emerald-500",
  inconvenient: "bg-amber-500",
  unavailable: "bg-red-500",
};

const statusCycle: CellStatus[] = ["not_set", "available", "inconvenient", "unavailable"];

function nextInCycle(current: CellStatus): CellStatus {
  return statusCycle[(statusCycle.indexOf(current) + 1) % statusCycle.length];
}

const PERSON_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-pink-500", "bg-cyan-500",
  "bg-lime-500", "bg-rose-500", "bg-teal-500", "bg-indigo-500",
];

function getColorValue(idx: number): string {
  const colors = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
    "#84cc16", "#f43f5e", "#14b8a6", "#6366f1",
  ];
  return colors[idx % colors.length];
}

export function AvailabilityCalendar({
  participant,
  retreatType,
  allAvailability,
  participants,
  dates,
  onSetStatus,
  onPaintEnd,
  onReset,
}: AvailabilityCalendarProps) {
  const myAvailability = allAvailability.filter(
    (a) => a.participantId === participant.id && a.retreatType === retreatType
  );
  const myStatusMap = new Map<string, CellStatus>(
    myAvailability.map((a) => [a.date, a.status as CellStatus])
  );

  function getMy(date: string): CellStatus {
    return myStatusMap.get(date) || "not_set";
  }

  const otherParticipants = participants.filter((p) => p.id !== participant.id);

  function getOther(pId: number, date: string): CellStatus {
    const e = allAvailability.find(
      (a) => a.participantId === pId && a.retreatType === retreatType && a.date === date
    );
    return e ? (e.status as CellStatus) : "not_set";
  }

  // --- Desktop mouse drag-to-paint ---
  const mouseDownRef = useRef(false);
  const paintTargetRef = useRef<CellStatus | null>(null);
  const paintedRef = useRef<Set<string>>(new Set());
  const [, forceRender] = useState(0);

  const paintCell = useCallback(
    (date: string, targetStatus: CellStatus) => {
      if (paintedRef.current.has(date)) return;
      paintedRef.current.add(date);
      onSetStatus(date, targetStatus);
      forceRender((n) => n + 1);
    },
    [onSetStatus]
  );

  const handleMouseDown = useCallback(
    (date: string) => {
      const target = nextInCycle(getMy(date));
      mouseDownRef.current = true;
      paintTargetRef.current = target;
      paintedRef.current = new Set();
      paintCell(date, target);
    },
    [myStatusMap, paintCell]
  );

  const handleMouseEnterCell = useCallback(
    (date: string) => {
      if (mouseDownRef.current && paintTargetRef.current !== null) {
        paintCell(date, paintTargetRef.current);
      }
    },
    [paintCell]
  );

  const handleMouseUp = useCallback(() => {
    if (mouseDownRef.current) {
      mouseDownRef.current = false;
      paintTargetRef.current = null;
      paintedRef.current = new Set();
      onPaintEnd?.();
    }
  }, [onPaintEnd]);

  // --- Mobile: simple tap (click) ---
  const handleClick = useCallback(
    (date: string) => {
      const target = nextInCycle(getMy(date));
      onSetStatus(date, target);
    },
    [myStatusMap, onSetStatus]
  );

  // --- Desktop hover tooltip ---
  const [tooltip, setTooltip] = useState<{ date: string; rect: DOMRect } | null>(null);

  useEffect(() => {
    if (!tooltip) return;
    const dismiss = () => setTooltip(null);
    window.addEventListener("scroll", dismiss, true);
    return () => window.removeEventListener("scroll", dismiss, true);
  }, [tooltip]);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  const months = groupByMonth(dates);
  const hasManual = myAvailability.some((a) => a.source === "manual");

  return (
    <div className="space-y-4" onMouseLeave={() => setTooltip(null)}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-white border" />
            <span>Not set</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-emerald-200 border" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-amber-200 border" />
            <span>If must</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-200 border" />
            <span>Unavailable</span>
          </div>
        </div>
        {hasManual && onReset && (
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={onReset}>
            Reset all
          </Button>
        )}
      </div>

      {otherParticipants.length > 0 && (
        <div className="flex gap-3 text-xs flex-wrap">
          <span className="text-muted-foreground">Others:</span>
          {otherParticipants.map((p, idx) => (
            <div key={p.id} className="flex items-center gap-1">
              <span className={cn("w-2.5 h-2.5 rounded-full", PERSON_COLORS[idx % PERSON_COLORS.length])} />
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Tap to cycle status. On desktop, click and drag to paint multiple days.
      </p>

      {months.map(({ label, weeks }) => (
        <div key={label}>
          <h3 className="text-sm font-semibold mb-2">{label}</h3>
          <div className="grid grid-cols-7 gap-[2px] text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="text-[10px] text-muted-foreground font-medium py-1">
                {d}
              </div>
            ))}
            {weeks.flat().map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} />;

              const myStatus = getMy(cell);
              const d = parseDate(cell);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;

              return (
                <div
                  key={cell}
                  data-date={cell}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleMouseDown(cell);
                  }}
                  onMouseEnter={(e) => {
                    handleMouseEnterCell(cell);
                    if (!mouseDownRef.current) {
                      setTooltip({ date: cell, rect: e.currentTarget.getBoundingClientRect() });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={(e) => {
                    // Only handle clicks from touch — mouse clicks are handled by mouseDown
                    if (e.detail === 0) handleClick(cell);
                  }}
                  onTouchEnd={(e) => {
                    // Tap on mobile: cycle status
                    e.preventDefault();
                    handleClick(cell);
                  }}
                  className={cn(
                    "relative aspect-square flex items-center justify-center rounded text-[11px] font-medium select-none cursor-pointer min-h-[32px] transition-colors active:scale-90 active:opacity-70",
                    cellBg[myStatus],
                    myStatus === "not_set" && "border border-dashed border-border/40",
                    isWeekend && "font-bold"
                  )}
                >
                  {d.getDate()}
                  {otherParticipants.length > 0 && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-[2px]">
                      {otherParticipants.map((p, idx) => {
                        const s = getOther(p.id, cell);
                        if (s === "not_set" || s === "unavailable") return null;
                        return (
                          <span
                            key={p.id}
                            className={cn(
                              "w-[5px] h-[5px] rounded-full",
                              s === "available"
                                ? PERSON_COLORS[idx % PERSON_COLORS.length]
                                : "border border-current bg-transparent"
                            )}
                            style={
                              s === "inconvenient"
                                ? { borderColor: getColorValue(idx) }
                                : undefined
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {tooltip && (
        <Tooltip
          date={tooltip.date}
          rect={tooltip.rect}
          myStatus={getMy(tooltip.date)}
          others={otherParticipants.map((p) => ({
            name: p.name,
            status: getOther(p.id, tooltip.date),
          }))}
        />
      )}
    </div>
  );
}

function Tooltip({
  date, rect, myStatus, others,
}: {
  date: string; rect: DOMRect; myStatus: CellStatus;
  others: { name: string; status: CellStatus }[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const w = 180;
  let left = rect.left + rect.width / 2 - w / 2;
  if (left < 4) left = 4;
  if (left + w > window.innerWidth - 4) left = window.innerWidth - 4 - w;
  const showAbove = window.innerHeight - rect.bottom < 100;

  const d = parseDate(date);
  const dayN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return createPortal(
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-lg p-2 text-xs pointer-events-none animate-in fade-in-0 zoom-in-95 duration-75"
      style={{
        left,
        width: w,
        ...(showAbove
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      }}
    >
      <div className="font-medium mb-1">{dayN[d.getDay()]}, {monN[d.getMonth()]} {d.getDate()}</div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", dotBg[myStatus])} />
          <span className="font-medium">You</span>
          <span className="text-muted-foreground ml-auto">{statusLabels[myStatus]}</span>
        </div>
        {others.map((o) => (
          <div key={o.name} className="flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full", dotBg[o.status])} />
            <span>{o.name}</span>
            <span className="text-muted-foreground ml-auto">{statusLabels[o.status]}</span>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

function groupByMonth(dates: string[]): { label: string; weeks: (string | null)[][] }[] {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const grouped = new Map<string, string[]>();
  for (const date of dates) {
    const key = date.substring(0, 7);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(date);
  }
  return Array.from(grouped.entries()).map(([key, monthDates]) => {
    const [year, month] = key.split("-").map(Number);
    const label = `${monthNames[month - 1]} ${year}`;
    const firstDay = parseDate(monthDates[0]);
    let dayOfWeek = firstDay.getDay();
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const cells: (string | null)[] = [];
    for (let i = 0; i < dayOfWeek; i++) cells.push(null);
    for (const d of monthDates) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { label, weeks };
  });
}
