import { pgTable, serial, text, date, real, timestamp, unique, jsonb } from "drizzle-orm/pg-core";

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icalUrl: text("ical_url"),
  icalLastSynced: timestamp("ical_last_synced"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const monthlyVotes = pgTable(
  "monthly_votes",
  {
    id: serial("id").primaryKey(),
    participantId: serial("participant_id").references(() => participants.id),
    fridayDate: date("friday_date").notNull(),
    vote: text("vote").notNull(), // 'yes' | 'no' | 'if_must_be'
  },
  (t) => [unique().on(t.participantId, t.fridayDate)]
);

export const retreatAvailability = pgTable(
  "retreat_availability",
  {
    id: serial("id").primaryKey(),
    participantId: serial("participant_id").references(() => participants.id),
    retreatType: text("retreat_type").notNull(), // 'mini' | 'full'
    date: date("date").notNull(),
    status: text("status").notNull(), // 'available' | 'inconvenient' | 'unavailable'
    source: text("source").notNull().default("manual"), // 'manual' | 'ical'
  },
  (t) => [unique().on(t.participantId, t.retreatType, t.date)]
);

export const retreatVotes = pgTable(
  "retreat_votes",
  {
    id: serial("id").primaryKey(),
    participantId: serial("participant_id").references(() => participants.id),
    retreatType: text("retreat_type").notNull(), // 'mini' | 'full'
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    vote: text("vote").notNull(), // 'yes' | 'no' | 'if_must_be'
  },
  (t) => [unique().on(t.participantId, t.retreatType, t.startDate)]
);

export const icalEvents = pgTable(
  "ical_events",
  {
    id: serial("id").primaryKey(),
    participantId: serial("participant_id").references(() => participants.id),
    date: date("date").notNull(),
    title: text("title"),
    allDay: text("all_day").notNull().default("false"),
    startTime: text("start_time"),
    endTime: text("end_time"),
  },
  (t) => [unique().on(t.participantId, t.date, t.title)]
);

export const backups = pgTable("backups", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  dataHash: text("data_hash").notNull(),
  data: jsonb("data").notNull(),
});
