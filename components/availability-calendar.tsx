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

type CellStatus = AvailabilityStatus | "not_set";

const cellColors: Record<CellStatus, string> = {
  not_set: "bg-white dark:bg-muted/30 border border-dashed border-border/50",
  available: "bg-emerald-100 dark:bg-emerald-900/30",
  inconvenient: "bg-amber-200 dark:bg-amber-900/40",
  unavailable: "bg-red-200 dark:bg-red-900/50",
};

const statusLabels: Record<CellStatus, string> = {
  not_set: "Not set",
  available: "Available",
  inconvenient: "If must",
  unavailable: "Unavailable",
};

const dotColors: Record<CellStatus, string> = {
  not_set: "bg-gray-300",
  available: "bg-emerald-500",
  inconvenient: "bg-amber-500",
  unavailable: "bg-red-500",
};

const initialColors: Record<CellStatus, string> = {
  not_set: "text-gray-400",
  available: "text-emerald-600",
  inconvenient: "text-amber-600",
  unavailable: "text-red-500",
};

const cycle: CellStatus[] = ["not_set", "available", "inconvenient", "unavailable"];

function nextStatus(current: CellStatus): CellStatus {
  return cycle[(cycle.indexOf(current) + 1) % cycle.length];
}

function getEffective(status: CellStatus): AvailabilityStatus {
  return status === "not_set" ? "unavailable" : status;
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
  const myStatusMap = new Map<string, CellStatus>(
    myAvailability.map((a) => [a.date, a.status as AvailabilityStatus])
  );

  function getMyCellStatus(date: string): CellStatus {
    return myStatusMap.get(date) || "not_set";
  }

  const paintStatusRef = useRef<CellStatus | null>(null);
  const paintedRef = useRef<Set<string>>(new Set());
  const [isPainting, setIsPainting] = useState(false);
  const [tooltip, setTooltip] = useState<{ date: string; rect: DOMRect } | null>(null);

  const startPaint = useCallback(
    (date: string) => {
      const current = getMyCellStatus(date);
      const target = nextStatus(current);
      paintStatusRef.current = target;
      paintedRef.current = new Set([date]);
      setIsPainting(true);
      onSetStatus(date, getEffective(target));
    },
    [myStatusMap, onSetStatus]
  );

  const continuePaint = useCallback(
    (date: string) => {
      if (!isPainting || paintStatusRef.current === null) return;
      if (paintedRef.current.has(date)) return;
      paintedRef.current.add(date);
      onSetStatus(date, getEffective(paintStatusRef.current));
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
  }, [onPaintEnd]);

  const otherParticipants = participants.filter((p) => p.id !== participant.id);

  function getOtherStatus(pId: number, date: string): CellStatus {
    const entry = allAvailability.find(
      (a) => a.participantId === pId && a.retreatType === retreatType && a.date === date
    );
    return entry ? (entry.status as AvailabilityStatus) : "not_set";
  }

  const handleMouseEnter = useCallback(
    (date: string, el: HTMLElement) => {
      if (isPainting) return;
      setTooltip({ date, rect: el.getBoundingClientRect() });
    },
    [isPainting]
  );

  useEffect(() => {
    if (!tooltip) return;
    const dismiss = () => setTooltip(null);
    window.addEventListener("scroll", dismiss, true);
    return () => window.removeEventListener("scroll", dismiss, true);
  }, [tooltip]);

  const months = groupByMonth(dates);

  return (
    <div
      className="space-y-4"
      onMouseLeave={() => { stopPaint(); setTooltip(null); }}
      onMouseUp={stopPaint}
      onTouchEnd={stopPaint}
      onTouchCancel={stopPaint}
    >
      <div className="flex gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-white border border-dashed" />
          <span>Not set</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/30 border" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-amber-200 dark:bg-amber-900/40 border" />
          <span>If must</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-200 dark:bg-red-900/50 border" />
          <span>Unavailable</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Tap to cycle: Not set → Available → If must → Unavailable. Drag to paint. Unset dates count as unavailable.
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
              if (!cell) return <div key={`empty-${i}`} className="mb-1" />;

              const myStatus = getMyCellStatus(cell);
              const d = parseDate(cell);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;

              const othersStatuses = otherParticipants.map((p) => ({
                p,
                status: getOtherStatus(p.id, cell),
              }));

              return (
                <div key={cell} className="mb-1 flex flex-col items-center">
                  <div
                    onPointerDown={(e) => {
                      e.preventDefault();
                      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                      startPaint(cell);
                    }}
                    onPointerEnter={(e) => {
                      continuePaint(cell);
                      handleMouseEnter(cell, e.currentTarget);
                    }}
                    onPointerLeave={() => setTooltip(null)}
                    className={cn(
                      "relative w-full aspect-square flex items-center justify-center rounded text-[11px] font-medium select-none cursor-pointer min-h-[32px] transition-colors",
                      cellColors[myStatus],
                      isWeekend && "font-bold"
                    )}
                  >
                    {d.getDate()}
                  </div>
                  <div className="flex justify-center gap-[1px] min-h-[12px] mt-[1px]">
                    {othersStatuses.map((o) => (
                      <span
                        key={o.p.id}
                        className={cn("text-[8px] font-bold leading-none", initialColors[o.status])}
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

      {tooltip && (
        <FloatingTooltip
          date={tooltip.date}
          rect={tooltip.rect}
          myStatus={getMyCellStatus(tooltip.date)}
          others={otherParticipants.map((p) => ({
            name: p.name,
            status: getOtherStatus(p.id, tooltip.date),
          }))}
        />
      )}
    </div>
  );
}

function FloatingTooltip({
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
  const top = showAbove ? undefined : rect.bottom + 6;
  const bottom = showAbove ? window.innerHeight - rect.top + 6 : undefined;

  const d = parseDate(date);
  const dayN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return createPortal(
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-lg p-2 text-xs pointer-events-none animate-in fade-in-0 zoom-in-95 duration-75"
      style={{ left, top, bottom, width: w }}
    >
      <div className="font-medium mb-1">{dayN[d.getDay()]}, {monN[d.getMonth()]} {d.getDate()}</div>
      <div className="space-y-0.5">
        <Row name="You" status={myStatus} bold />
        {others.map((o) => <Row key={o.name} name={o.name} status={o.status} />)}
      </div>
    </div>,
    document.body
  );
}

function Row({ name, status, bold }: { name: string; status: CellStatus; bold?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[status])} />
      <span className={bold ? "font-medium" : ""}>{name}</span>
      <span className="text-muted-foreground ml-auto">{statusLabels[status]}</span>
    </div>
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
