import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { retreatVotes, retreatAvailability, participants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getRetreatDateRange, getContiguousPeriods, getAllDatesInRange } from "@/lib/dates";
import { compareOptions } from "@/lib/scoring";
import type { Vote, RetreatProposal, AvailabilityStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") as "mini" | "full";
  if (!type) {
    return NextResponse.json({ error: "type required" }, { status: 400 });
  }

  const days = type === "mini" ? 2 : 4;
  const range = getRetreatDateRange(type);
  const allPeriods = getContiguousPeriods(range.start, range.end, days);

  const allAvailability = await db
    .select()
    .from(retreatAvailability)
    .where(eq(retreatAvailability.retreatType, type));

  const allParticipants = await db.select().from(participants);

  const allVotes = await db
    .select()
    .from(retreatVotes)
    .where(eq(retreatVotes.retreatType, type));

  const availByParticipantDate = new Map<string, AvailabilityStatus>();
  for (const a of allAvailability) {
    availByParticipantDate.set(`${a.participantId}:${a.date}`, a.status as AvailabilityStatus);
  }

  const proposals: RetreatProposal[] = allPeriods.map((period) => {
    const datesInPeriod = getAllDatesInRange(period.startDate, period.endDate);
    let totalAvailable = 0;
    let totalInconvenient = 0;
    let totalUnavailable = 0;

    for (const p of allParticipants) {
      let worstStatus: AvailabilityStatus = "available";
      for (const d of datesInPeriod) {
        const s = availByParticipantDate.get(`${p.id}:${d}`) || "unavailable";
        if (s === "unavailable") {
          worstStatus = "unavailable";
          break;
        }
        if (s === "inconvenient") worstStatus = "inconvenient";
      }
      if (worstStatus === "available") totalAvailable++;
      else if (worstStatus === "inconvenient") totalInconvenient++;
      else totalUnavailable++;
    }

    const periodVotes = allVotes
      .filter((v) => v.startDate === period.startDate)
      .map((v) => ({
        participantId: v.participantId,
        participantName: allParticipants.find((p) => p.id === v.participantId)?.name || "?",
        vote: v.vote as Vote,
      }));

    const score = totalAvailable * 2 + totalInconvenient * 1;

    return {
      startDate: period.startDate,
      endDate: period.endDate,
      score,
      noCount: totalUnavailable,
      votes: periodVotes,
      availabilitySummary: {
        available: totalAvailable,
        inconvenient: totalInconvenient,
        unavailable: totalUnavailable,
      },
    };
  });

  proposals.sort((a, b) => compareOptions(a, b));

  return NextResponse.json({
    proposals: proposals.slice(0, 10),
    votes: allVotes,
  });
}

export async function POST(req: NextRequest) {
  const { participantId, retreatType, startDate, endDate, vote } = await req.json();

  if (!participantId || !retreatType || !startDate || !vote) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(retreatVotes)
    .where(
      and(
        eq(retreatVotes.participantId, participantId),
        eq(retreatVotes.retreatType, retreatType),
        eq(retreatVotes.startDate, startDate)
      )
    );

  if (existing.length > 0) {
    if (vote === existing[0].vote) {
      await db.delete(retreatVotes).where(eq(retreatVotes.id, existing[0].id));
      return NextResponse.json({ deleted: true });
    }
    const [updated] = await db
      .update(retreatVotes)
      .set({ vote })
      .where(eq(retreatVotes.id, existing[0].id))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(retreatVotes)
    .values({ participantId, retreatType, startDate, endDate, vote })
    .returning();
  return NextResponse.json(created);
}
