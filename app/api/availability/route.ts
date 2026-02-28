import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { retreatAvailability } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  if (type) {
    const rows = await db
      .select()
      .from(retreatAvailability)
      .where(eq(retreatAvailability.retreatType, type));
    return NextResponse.json(rows);
  }
  const all = await db.select().from(retreatAvailability);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const { participantId, retreatType, date, status } = await req.json();

  if (!participantId || !retreatType || !date || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(retreatAvailability)
    .where(
      and(
        eq(retreatAvailability.participantId, participantId),
        eq(retreatAvailability.retreatType, retreatType),
        eq(retreatAvailability.date, date)
      )
    );

  // "unavailable" is the default — remove DB entry to go back to default
  if (status === "unavailable") {
    if (existing.length > 0) {
      await db.delete(retreatAvailability).where(eq(retreatAvailability.id, existing[0].id));
    }
    return NextResponse.json({ deleted: true });
  }

  if (existing.length > 0) {
    const [updated] = await db
      .update(retreatAvailability)
      .set({ status, source: "manual" })
      .where(eq(retreatAvailability.id, existing[0].id))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(retreatAvailability)
    .values({ participantId, retreatType, date, status, source: "manual" })
    .returning();
  return NextResponse.json(created);
}
