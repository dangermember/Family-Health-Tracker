import { pgTable, serial, integer, timestamp, text, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { familyMembersTable } from "./family-members";

export const periodEntriesTable = pgTable("period_entries", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => familyMembersTable.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  numberOfDays: integer("number_of_days"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPeriodEntrySchema = createInsertSchema(periodEntriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPeriodEntry = z.infer<typeof insertPeriodEntrySchema>;
export type PeriodEntry = typeof periodEntriesTable.$inferSelect;
