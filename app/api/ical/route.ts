import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { participants, icalEvents, retreatAvailability } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchAndParseIcal } from "@/lib/ical";

export async function POST(req: NextRequest) {
  const { participantId, icalUrl } = await req.json();

  if (!participantId) {
    return NextResponse.json({ error: "participantId required" }, { status: 400 });
  }

  await db
    .update(participants)
    .set({
      icalUrl: icalUrl || null,
      icalLastSynced: icalUrl ? new Date() : null,
    })
    .where(eq(participants.id, participantId));

  if (!icalUrl) {
    await db.delete(icalEvents).where(eq(icalEvents.participantId, participantId));
    await db
      .delete(retreatAvailability)
      .where(
        and(
          eq(retreatAvailability.participantId, participantId),
          eq(retreatAvailability.source, "ical")
        )
      );
    return NextResponse.json({ ok: true, events: [] });
  }

  try {
    const events = await fetchAndParseIcal(icalUrl);

    await db.delete(icalEvents).where(eq(icalEvents.participantId, participantId));

    if (events.length > 0) {
      await db.insert(icalEvents).values(
        events.map((e) => ({
          participantId,
          date: e.date,
          title: e.title,
          allDay: e.allDay ? "true" : "false",
          startTime: e.startTime || null,
          endTime: e.endTime || null,
        }))
      );
    }

    await db
      .delete(retreatAvailability)
      .where(
        and(
          eq(retreatAvailability.participantId, participantId),
          eq(retreatAvailability.source, "ical")
        )
      );

    const icalAvailability: {
      participantId: number;
      retreatType: string;
      date: string;
      status: string;
      source: string;
    }[] = [];

    for (const ev of events) {
      const status = ev.allDay ? "unavailable" : "inconvenient";
      for (const retreatType of ["mini", "full"] as const) {
        icalAvailability.push({
          participantId,
          retreatType,
          date: ev.date,
          status,
          source: "ical",
        });
      }
    }

    if (icalAvailability.length > 0) {
      const manualEntries = await db
        .select()
        .from(retreatAvailability)
        .where(
          and(
            eq(retreatAvailability.participantId, participantId),
            eq(retreatAvailability.source, "manual")
          )
        );
      const manualKeys = new Set(manualEntries.map((e) => `${e.retreatType}:${e.date}`));
      const toInsert = icalAvailability.filter(
        (a) => !manualKeys.has(`${a.retreatType}:${a.date}`)
      );
      if (toInsert.length > 0) {
        await db.insert(retreatAvailability).values(toInsert).onConflictDoNothing();
      }
    }

    return NextResponse.json({ ok: true, eventsCount: events.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch calendar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const participantId = req.nextUrl.searchParams.get("participantId");
  if (!participantId) {
    return NextResponse.json({ error: "participantId required" }, { status: 400 });
  }
  const events = await db
    .select()
    .from(icalEvents)
    .where(eq(icalEvents.participantId, Number(participantId)));
  return NextResponse.json(events);
}
