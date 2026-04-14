import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, lengthEntriesTable } from "@workspace/db";
import {
  CreateLengthEntryBody,
  UpdateLengthEntryParams,
  UpdateLengthEntryBody,
  DeleteLengthEntryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/length", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const entries = await db
    .select()
    .from(lengthEntriesTable)
    .where(eq(lengthEntriesTable.userId, userId))
    .orderBy(desc(lengthEntriesTable.recordedAt));

  res.json(entries.map(formatEntry));
});

router.post("/length", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLengthEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const [entry] = await db
    .insert(lengthEntriesTable)
    .values({
      userId,
      lengthCm: parsed.data.lengthCm,
      recordedAt: new Date(parsed.data.recordedAt),
      note: parsed.data.note ?? null,
    })
    .returning();

  res.status(201).json(formatEntry(entry));
});

router.patch("/length/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLengthEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLengthEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const updates: Partial<typeof lengthEntriesTable.$inferInsert> = {};
  if (parsed.data.lengthCm !== undefined) updates.lengthCm = parsed.data.lengthCm;
  if (parsed.data.recordedAt !== undefined) updates.recordedAt = new Date(parsed.data.recordedAt);
  if (parsed.data.note !== undefined) updates.note = parsed.data.note;

  const [entry] = await db
    .update(lengthEntriesTable)
    .set(updates)
    .where(and(eq(lengthEntriesTable.id, params.data.id), eq(lengthEntriesTable.userId, userId)))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.json(formatEntry(entry));
});

router.delete("/length/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteLengthEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.session.userId!;
  const [entry] = await db
    .delete(lengthEntriesTable)
    .where(and(eq(lengthEntriesTable.id, params.data.id), eq(lengthEntriesTable.userId, userId)))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.sendStatus(204);
});

function formatEntry(entry: typeof lengthEntriesTable.$inferSelect) {
  return {
    id: entry.id,
    userId: entry.userId,
    lengthCm: entry.lengthCm,
    recordedAt: entry.recordedAt,
    note: entry.note,
    createdAt: entry.createdAt,
  };
}

export default router;
