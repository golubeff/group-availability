export const PERIOD_START = new Date(2026, 5, 1); // June 2026
export const PERIOD_END = new Date(2027, 4, 31); // May 2027
export const MINI_RETREAT_END = new Date(2026, 11, 31); // Nov 2026

export function getAllFridaysPerMonth(): { month: string; label: string; fridays: string[] }[] {
  const months: { month: string; label: string; fridays: string[] }[] = [];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const d = new Date(PERIOD_START);
  while (d <= PERIOD_END) {
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const fridays: string[] = [];

    const day = new Date(year, month, 1);
    while (day.getMonth() === month) {
      if (day.getDay() === 5) {
        fridays.push(formatDate(day));
      }
      day.setDate(day.getDate() + 1);
    }

    months.push({
      month: monthKey,
      label: `${monthNames[month]} ${year}`,
      fridays,
    });

    d.setMonth(d.getMonth() + 1);
  }

  return months;
}

export function getRetreatDateRange(type: "mini" | "full"): { start: string; end: string } {
  const end = type === "mini" ? MINI_RETREAT_END : PERIOD_END;
  return {
    start: formatDate(PERIOD_START),
    end: formatDate(end),
  };
}

export function getAllDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const d = parseDate(start);
  const endD = parseDate(end);
  while (d <= endD) {
    dates.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function getContiguousPeriods(
  startRange: string,
  endRange: string,
  days: number
): { startDate: string; endDate: string }[] {
  const periods: { startDate: string; endDate: string }[] = [];
  const d = parseDate(startRange);
  const endD = parseDate(endRange);

  while (d <= endD) {
    const periodEnd = new Date(d);
    periodEnd.setDate(periodEnd.getDate() + days - 1);
    if (periodEnd <= endD) {
      periods.push({
        startDate: formatDate(d),
        endDate: formatDate(periodEnd),
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return periods;
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateShort(dateStr: string): string {
  const d = parseDate(dateStr);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
}

export function formatDateRange(start: string, end: string): string {
  return `${formatDateShort(start)} — ${formatDateShort(end)}`;
}

export function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}
