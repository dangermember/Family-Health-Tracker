import { pgTable, serial, integer, real, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const lengthEntriesTable = pgTable("length_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  lengthCm: real("length_cm").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLengthEntrySchema = createInsertSchema(lengthEntriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLengthEntry = z.infer<typeof insertLengthEntrySchema>;
export type LengthEntry = typeof lengthEntriesTable.$inferSelect;
