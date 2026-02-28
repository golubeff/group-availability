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

  // "not_set" means go back to default — remove from DB
  if (status === "not_set") {
    if (existing.length > 0) {
      await db.delete(retreatAvailability).where(eq(retreatAvailability.id, existing[0].id));
    }
    return NextResponse.json({ deleted: true });
  }

  // available, inconvenient, unavailable — store explicitly
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

export async function DELETE(req: NextRequest) {
  const { participantId, retreatType } = await req.json();
  if (!participantId || !retreatType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  await db
    .delete(retreatAvailability)
    .where(
      and(
        eq(retreatAvailability.participantId, participantId),
        eq(retreatAvailability.retreatType, retreatType),
        eq(retreatAvailability.source, "manual")
      )
    );
  return NextResponse.json({ ok: true });
}
