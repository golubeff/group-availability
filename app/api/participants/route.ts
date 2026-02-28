import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { participants, monthlyVotes, retreatAvailability, retreatVotes, icalEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const trimmed = name.trim();
  const existing = await db.select().from(participants).where(eq(participants.name, trimmed));

  if (existing.length > 0) {
    return NextResponse.json(existing[0]);
  }

  const [created] = await db.insert(participants).values({ name: trimmed }).returning();
  return NextResponse.json(created);
}

export async function GET() {
  const all = await db.select().from(participants);
  return NextResponse.json(all);
}

export async function DELETE(req: NextRequest) {
  const { participantId } = await req.json();
  if (!participantId) {
    return NextResponse.json({ error: "participantId required" }, { status: 400 });
  }

  await db.delete(monthlyVotes).where(eq(monthlyVotes.participantId, participantId));
  await db.delete(retreatAvailability).where(eq(retreatAvailability.participantId, participantId));
  await db.delete(retreatVotes).where(eq(retreatVotes.participantId, participantId));
  await db.delete(icalEvents).where(eq(icalEvents.participantId, participantId));
  await db.delete(participants).where(eq(participants.id, participantId));

  return NextResponse.json({ ok: true });
}
