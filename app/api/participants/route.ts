import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
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
