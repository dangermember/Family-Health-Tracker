import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, weightEntriesTable } from "@workspace/db";
import {
  ListWeightEntriesQueryParams,
  CreateWeightEntryBody,
  UpdateWeightEntryParams,
  UpdateWeightEntryBody,
  DeleteWeightEntryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/weight", requireAuth, async (req, res): Promise<void> => {
  const qp = ListWeightEntriesQueryParams.safeParse(req.query);
  const userId = req.session.userId!;

  const entries = await db
    .select()
    .from(weightEntriesTable)
    .where(eq(weightEntriesTable.userId, userId))
    .orderBy(desc(weightEntriesTable.recordedAt));

  res.json(entries.map(formatEntry));
});

router.post("/weight", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWeightEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const [entry] = await db
    .insert(weightEntriesTable)
    .values({
      userId,
      weightKg: parsed.data.weightKg,
      recordedAt: new Date(parsed.data.recordedAt),
      note: parsed.data.note ?? null,
    })
    .returning();

  res.status(201).json(formatEntry(entry));
});

router.patch("/weight/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateWeightEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateWeightEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const updates: Partial<typeof weightEntriesTable.$inferInsert> = {};
  if (parsed.data.weightKg !== undefined) updates.weightKg = parsed.data.weightKg;
  if (parsed.data.recordedAt !== undefined) updates.recordedAt = new Date(parsed.data.recordedAt);
  if (parsed.data.note !== undefined) updates.note = parsed.data.note;

  const [entry] = await db
    .update(weightEntriesTable)
    .set(updates)
    .where(and(eq(weightEntriesTable.id, params.data.id), eq(weightEntriesTable.userId, userId)))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.json(formatEntry(entry));
});

router.delete("/weight/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteWeightEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.session.userId!;
  const [entry] = await db
    .delete(weightEntriesTable)
    .where(and(eq(weightEntriesTable.id, params.data.id), eq(weightEntriesTable.userId, userId)))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.sendStatus(204);
});

function formatEntry(entry: typeof weightEntriesTable.$inferSelect) {
  return {
    id: entry.id,
    userId: entry.userId,
    weightKg: entry.weightKg,
    recordedAt: entry.recordedAt,
    note: entry.note,
    createdAt: entry.createdAt,
  };
}

export default router;
