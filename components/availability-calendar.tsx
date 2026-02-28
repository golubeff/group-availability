"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { parseDate } from "@/lib/dates";
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
  onSetStatus: (date: string, status: AvailabilityStatus) => void;
  onPaintEnd?: () => void;
}

const myStatusColors: Record<AvailabilityStatus, string> = {
  available: "bg-emerald-100 dark:bg-emerald-900/30",
  inconvenient: "bg-amber-200 dark:bg-amber-900/40",
  unavailable: "bg-red-200 dark:bg-red-900/50",
};

function nextStatus(current: AvailabilityStatus): AvailabilityStatus {
  const cycle: AvailabilityStatus[] = ["available", "inconvenient", "unavailable"];
  return cycle[(cycle.indexOf(current) + 1) % cycle.length];
}

const dotColors: Record<string, string> = {
  available: "bg-emerald-500",
  inconvenient: "bg-amber-500",
  unavailable: "bg-red-500",
};

interface TooltipData {
  date: string;
  rect: DOMRect;
  myStatus: AvailabilityStatus;
  others: { name: string; status: AvailabilityStatus }[];
}

export function AvailabilityCalendar({
  participant,
  retreatType,
  allAvailability,
  participants,
  dates,
  onSetStatus,
  onPaintEnd,
}: AvailabilityCalendarProps) {
  const myAvailability = allAvailability.filter(
    (a) => a.participantId === participant.id && a.retreatType === retreatType
  );
  const myStatusMap = new Map(myAvailability.map((a) => [a.date, a.status as AvailabilityStatus]));

  const paintStatusRef = useRef<AvailabilityStatus | null>(null);
  const paintedRef = useRef<Set<string>>(new Set());
  const [isPainting, setIsPainting] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressFiredRef = useRef(false);

  const startPaint = useCallback(
    (date: string) => {
      const current = myStatusMap.get(date) || "available";
      const target = nextStatus(current);
      paintStatusRef.current = target;
      paintedRef.current = new Set([date]);
      setIsPainting(true);
      onSetStatus(date, target);
    },
    [myStatusMap, onSetStatus]
  );

  const continuePaint = useCallback(
    (date: string) => {
      if (!isPainting || paintStatusRef.current === null) return;
      if (paintedRef.current.has(date)) return;
      paintedRef.current.add(date);
      onSetStatus(date, paintStatusRef.current);
    },
    [isPainting, onSetStatus]
  );

  const stopPaint = useCallback(() => {
    if (paintStatusRef.current !== null) {
      paintStatusRef.current = null;
      paintedRef.current = new Set();
      setIsPainting(false);
      onPaintEnd?.();
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, [onPaintEnd]);

  const otherParticipants = participants.filter((p) => p.id !== participant.id);

  function buildTooltip(date: string, el: HTMLElement): TooltipData {
    const rect = el.getBoundingClientRect();
    const others = otherParticipants.map((p) => {
      const entry = allAvailability.find(
        (a) => a.participantId === p.id && a.retreatType === retreatType && a.date === date
      );
      return { name: p.name, status: (entry?.status || "available") as AvailabilityStatus };
    });
    return {
      date,
      rect,
      myStatus: myStatusMap.get(date) || "available",
      others,
    };
  }

  const handleMouseEnter = useCallback(
    (date: string, el: HTMLElement) => {
      if (isPainting) return;
      setTooltip(buildTooltip(date, el));
    },
    [isPainting, myStatusMap, allAvailability, otherParticipants, retreatType]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleTouchStart = useCallback(
    (date: string, el: HTMLElement) => {
      longPressFiredRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        setTooltip(buildTooltip(date, el));
      }, 400);
    },
    [myStatusMap, allAvailability, otherParticipants, retreatType]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Dismiss tooltip on scroll or outside tap
  useEffect(() => {
    if (!tooltip) return;
    const dismiss = () => setTooltip(null);
    window.addEventListener("scroll", dismiss, true);
    const timer = setTimeout(dismiss, 4000);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      clearTimeout(timer);
    };
  }, [tooltip]);

  const months = groupByMonth(dates);

  return (
    <div
      className="space-y-4"
      onMouseLeave={() => { stopPaint(); handleMouseLeave(); }}
      onMouseUp={stopPaint}
      onTouchEnd={stopPaint}
      onTouchCancel={stopPaint}
    >
      <div className="flex gap-4 text-xs flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/30 border" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-amber-200 dark:bg-amber-900/40 border" />
          <span>Inconvenient</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-200 dark:bg-red-900/50 border" />
          <span>Unavailable</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Tap to cycle status. Drag to paint. Hover (or long-press on mobile) for details.
      </p>

      {months.map(({ label, weeks }) => (
        <div key={label}>
          <h3 className="text-sm font-semibold mb-2">{label}</h3>
          <div className="grid grid-cols-7 gap-x-[2px] gap-y-0 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="text-[10px] text-muted-foreground font-medium py-1">
                {d}
              </div>
            ))}
            {weeks.flat().map((cell, i) => {
              if (!cell) {
                return <div key={`empty-${i}`} className="mb-1" />;
              }
              const myStatus = myStatusMap.get(cell) || "available";
              const othersWithIssues = otherParticipants
                .map((p) => {
                  const entry = allAvailability.find(
                    (a) => a.participantId === p.id && a.retreatType === retreatType && a.date === cell
                  );
                  return { p, status: (entry?.status || "available") as AvailabilityStatus };
                })
                .filter((e) => e.status !== "available");
              const d = parseDate(cell);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;

              return (
                <div key={cell} className="mb-1 flex flex-col items-center">
                  <div
                    onPointerDown={(e) => {
                      if (longPressFiredRef.current) {
                        e.preventDefault();
                        return;
                      }
                      e.preventDefault();
                      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                      startPaint(cell);
                    }}
                    onPointerEnter={(e) => {
                      continuePaint(cell);
                      handleMouseEnter(cell, e.currentTarget);
                    }}
                    onPointerLeave={() => {
                      handleMouseLeave();
                    }}
                    onTouchStart={(e) => {
                      handleTouchStart(cell, e.currentTarget);
                    }}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={() => {
                      handleTouchEnd();
                      setTooltip(null);
                    }}
                    className={cn(
                      "relative w-full aspect-square flex items-center justify-center rounded text-[11px] font-medium select-none cursor-pointer min-h-[32px] transition-colors",
                      myStatusColors[myStatus],
                      isWeekend && "font-bold"
                    )}
                  >
                    {d.getDate()}
                  </div>
                  <div className="flex justify-center gap-[1px] min-h-[14px] mt-[1px]">
                    {othersWithIssues.map((o) => (
                      <span
                        key={o.p.id}
                        className={cn(
                          "text-[8px] font-bold leading-none",
                          o.status === "unavailable" ? "text-red-500" : "text-amber-500"
                        )}
                      >
                        {o.p.name.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {tooltip && <FloatingTooltip tooltip={tooltip} />}
    </div>
  );
}

function FloatingTooltip({ tooltip }: { tooltip: TooltipData }) {
  const { date, rect, myStatus, others } = tooltip;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const tooltipWidth = 200;
  let left = rect.left + rect.width / 2 - tooltipWidth / 2;
  if (left < 8) left = 8;
  if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - 8 - tooltipWidth;

  const spaceBelow = window.innerHeight - rect.bottom;
  const showAbove = spaceBelow < 120;
  const top = showAbove ? rect.top - 8 : rect.bottom + 8;

  const d = parseDate(date);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const label = `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;

  return createPortal(
    <div
      className={cn(
        "fixed z-50 bg-popover border rounded-lg shadow-lg p-2.5 text-xs animate-in fade-in-0 zoom-in-95 duration-100",
        showAbove ? "origin-bottom" : "origin-top"
      )}
      style={{
        left,
        top: showAbove ? undefined : top,
        bottom: showAbove ? window.innerHeight - top : undefined,
        width: tooltipWidth,
      }}
    >
      <div className="font-medium text-sm mb-1.5">{label}</div>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColors[myStatus])} />
          <span className="font-medium">You</span>
          <span className="text-muted-foreground ml-auto">{myStatus}</span>
        </div>
        {others.map((o) => (
          <div key={o.name} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColors[o.status])} />
            <span>{o.name}</span>
            <span className="text-muted-foreground ml-auto">{o.status}</span>
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
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    return { label, weeks };
  });
}
