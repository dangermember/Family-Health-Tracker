import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, periodEntriesTable, usersTable } from "@workspace/db";
import {
  CreatePeriodEntryBody,
  UpdatePeriodEntryParams,
  UpdatePeriodEntryBody,
  DeletePeriodEntryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function getUserGender(userId: number): Promise<string | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return user?.gender ?? null;
}

router.get("/period", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const entries = await db
    .select()
    .from(periodEntriesTable)
    .where(eq(periodEntriesTable.userId, userId))
    .orderBy(desc(periodEntriesTable.startDate));

  res.json(entries.map(formatEntry));
});

router.post("/period", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePeriodEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const [entry] = await db
    .insert(periodEntriesTable)
    .values({
      userId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      numberOfDays: parsed.data.numberOfDays ?? null,
      note: parsed.data.note ?? null,
    })
    .returning();

  res.status(201).json(formatEntry(entry));
});

router.patch("/period/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePeriodEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePeriodEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const updates: Partial<typeof periodEntriesTable.$inferInsert> = {};
  if (parsed.data.startDate !== undefined) updates.startDate = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) updates.endDate = parsed.data.endDate;
  if (parsed.data.numberOfDays !== undefined) updates.numberOfDays = parsed.data.numberOfDays;
  if (parsed.data.note !== undefined) updates.note = parsed.data.note;

  const [entry] = await db
    .update(periodEntriesTable)
    .set(updates)
    .where(and(eq(periodEntriesTable.id, params.data.id), eq(periodEntriesTable.userId, userId)))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.json(formatEntry(entry));
});

router.delete("/period/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeletePeriodEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.session.userId!;
  const [entry] = await db
    .delete(periodEntriesTable)
    .where(and(eq(periodEntriesTable.id, params.data.id), eq(periodEntriesTable.userId, userId)))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.sendStatus(204);
});

function formatEntry(entry: typeof periodEntriesTable.$inferSelect) {
  return {
    id: entry.id,
    userId: entry.userId,
    startDate: entry.startDate,
    endDate: entry.endDate,
    numberOfDays: entry.numberOfDays,
    note: entry.note,
    createdAt: entry.createdAt,
  };
}

export default router;
