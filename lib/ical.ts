import ical from "node-ical";
import { formatDate, PERIOD_START, PERIOD_END } from "./dates";

function getSummary(ev: ical.VEvent): string {
  const s = ev.summary;
  if (!s) return "Busy";
  if (typeof s === "string") return s;
  if (typeof s === "object" && "val" in s) return (s as { val: string }).val;
  return "Busy";
}

export interface ParsedEvent {
  date: string;
  title: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
}

export async function fetchAndParseIcal(url: string): Promise<ParsedEvent[]> {
  const events = await ical.async.fromURL(url);
  const parsed: ParsedEvent[] = [];

  for (const key of Object.keys(events)) {
    const ev = events[key];
    if (!ev || ev.type !== "VEVENT") continue;

    const start = ev.start ? new Date(ev.start as unknown as string) : null;
    const end = ev.end ? new Date(ev.end as unknown as string) : null;
    if (!start) continue;

    if (start > PERIOD_END || (end && end < PERIOD_START)) continue;

    const isAllDay =
      ev.datetype === "date" ||
      (end !== null && end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000 - 1);

    const title = getSummary(ev as ical.VEvent);

    if (isAllDay && end) {
      const d = new Date(start);
      while (d < end) {
        if (d >= PERIOD_START && d <= PERIOD_END) {
          parsed.push({
            date: formatDate(d),
            title,
            allDay: true,
          });
        }
        d.setDate(d.getDate() + 1);
      }
    } else {
      if (start >= PERIOD_START && start <= PERIOD_END) {
        parsed.push({
          date: formatDate(start),
          title,
          allDay: false,
          startTime: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
          endTime: end
            ? `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
            : undefined,
        });
      }
    }
  }

  return parsed;
}

export function checkFridayConflict(
  events: ParsedEvent[],
  fridayDate: string
): { hasConflict: boolean; conflictTitle?: string } {
  const dayEvents = events.filter((e) => e.date === fridayDate);
  for (const ev of dayEvents) {
    if (ev.allDay) return { hasConflict: true, conflictTitle: ev.title };
    if (ev.startTime && ev.endTime) {
      const [sh, sm] = ev.startTime.split(":").map(Number);
      const [eh, em] = ev.endTime.split(":").map(Number);
      const evStart = sh * 60 + sm;
      const evEnd = eh * 60 + em;
      const meetStart = 11 * 60;
      const meetEnd = 15 * 60;
      if (evStart < meetEnd && evEnd > meetStart) {
        return { hasConflict: true, conflictTitle: ev.title };
      }
    }
  }
  return { hasConflict: false };
}
