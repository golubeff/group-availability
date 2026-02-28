import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  backups,
  participants,
  monthlyVotes,
  retreatAvailability,
  retreatVotes,
} from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { createHash } from "crypto";

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const MAX_BACKUPS = 100;

async function snapshotAllData() {
  const [p, mv, ra, rv] = await Promise.all([
    db.select().from(participants),
    db.select().from(monthlyVotes),
    db.select().from(retreatAvailability),
    db.select().from(retreatVotes),
  ]);
  return { participants: p, monthlyVotes: mv, retreatAvailability: ra, retreatVotes: rv };
}

function hashData(data: unknown): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === "restore") {
    return handleRestore(body.backupId);
  }

  return handleTrigger();
}

async function handleTrigger() {
  const lastBackup = await db
    .select({ id: backups.id, createdAt: backups.createdAt, dataHash: backups.dataHash })
    .from(backups)
    .orderBy(desc(backups.createdAt))
    .limit(1);

  if (lastBackup.length > 0 && lastBackup[0].createdAt) {
    const elapsed = Date.now() - lastBackup[0].createdAt.getTime();
    if (elapsed < COOLDOWN_MS) {
      return NextResponse.json({ skipped: true, reason: "cooldown" });
    }
  }

  const data = await snapshotAllData();
  const hash = hashData(data);

  if (lastBackup.length > 0 && lastBackup[0].dataHash === hash) {
    return NextResponse.json({ skipped: true, reason: "no_changes" });
  }

  await db.insert(backups).values({ dataHash: hash, data });

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(backups);
  const total = Number(countResult[0].count);
  if (total > MAX_BACKUPS) {
    const oldest = await db
      .select({ id: backups.id })
      .from(backups)
      .orderBy(backups.createdAt)
      .limit(total - MAX_BACKUPS);
    for (const row of oldest) {
      await db.delete(backups).where(eq(backups.id, row.id));
    }
  }

  return NextResponse.json({ created: true, hash });
}

async function handleRestore(backupId: number) {
  if (!backupId) {
    return NextResponse.json({ error: "backupId required" }, { status: 400 });
  }

  const [backup] = await db.select().from(backups).where(eq(backups.id, backupId));
  if (!backup) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  const data = backup.data as {
    participants: { id: number; name: string; icalUrl?: string | null; icalLastSynced?: string | null }[];
    monthlyVotes: { participantId: number; fridayDate: string; vote: string }[];
    retreatAvailability: { participantId: number; retreatType: string; date: string; status: string; source: string }[];
    retreatVotes: { participantId: number; retreatType: string; startDate: string; endDate: string; vote: string }[];
  };

  await db.delete(retreatVotes);
  await db.delete(retreatAvailability);
  await db.delete(monthlyVotes);
  await db.delete(participants);

  if (data.participants.length > 0) {
    for (const p of data.participants) {
      await db.execute(
        sql`INSERT INTO participants (id, name, ical_url, ical_last_synced) VALUES (${p.id}, ${p.name}, ${p.icalUrl ?? null}, ${p.icalLastSynced ? new Date(p.icalLastSynced) : null})`
      );
    }
    const maxId = Math.max(...data.participants.map((p) => p.id));
    await db.execute(sql`SELECT setval('participants_id_seq', ${maxId})`);
  }

  if (data.monthlyVotes.length > 0) {
    await db.insert(monthlyVotes).values(
      data.monthlyVotes.map((v) => ({
        participantId: v.participantId,
        fridayDate: v.fridayDate,
        vote: v.vote,
      }))
    );
  }

  if (data.retreatAvailability.length > 0) {
    await db.insert(retreatAvailability).values(
      data.retreatAvailability.map((a) => ({
        participantId: a.participantId,
        retreatType: a.retreatType,
        date: a.date,
        status: a.status,
        source: a.source,
      }))
    );
  }

  if (data.retreatVotes.length > 0) {
    await db.insert(retreatVotes).values(
      data.retreatVotes.map((v) => ({
        participantId: v.participantId,
        retreatType: v.retreatType,
        startDate: v.startDate,
        endDate: v.endDate,
        vote: v.vote,
      }))
    );
  }

  return NextResponse.json({ restored: true, backupId });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const [backup] = await db.select().from(backups).where(eq(backups.id, Number(id)));
    if (!backup) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(backup);
  }

  const list = await db
    .select({ id: backups.id, createdAt: backups.createdAt, dataHash: backups.dataHash })
    .from(backups)
    .orderBy(desc(backups.createdAt))
    .limit(50);

  return NextResponse.json(list);
}
