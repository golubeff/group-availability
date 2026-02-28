import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { monthlyVotes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const all = await db.select().from(monthlyVotes);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const { participantId, fridayDate, vote } = await req.json();

  if (!participantId || !fridayDate || !vote) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!["yes", "no", "if_must_be"].includes(vote)) {
    return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(monthlyVotes)
    .where(and(eq(monthlyVotes.participantId, participantId), eq(monthlyVotes.fridayDate, fridayDate)));

  if (existing.length > 0) {
    if (vote === existing[0].vote) {
      await db.delete(monthlyVotes).where(eq(monthlyVotes.id, existing[0].id));
      return NextResponse.json({ deleted: true });
    }
    const [updated] = await db
      .update(monthlyVotes)
      .set({ vote })
      .where(eq(monthlyVotes.id, existing[0].id))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(monthlyVotes)
    .values({ participantId, fridayDate, vote })
    .returning();
  return NextResponse.json(created);
}

export async function DELETE(req: NextRequest) {
  const { participantId } = await req.json();
  if (!participantId) {
    return NextResponse.json({ error: "participantId required" }, { status: 400 });
  }
  await db.delete(monthlyVotes).where(eq(monthlyVotes.participantId, participantId));
  return NextResponse.json({ ok: true });
}
