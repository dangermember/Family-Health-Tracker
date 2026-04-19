import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, weightEntriesTable, familyMembersTable } from "@workspace/db";
import {
  ListWeightEntriesQueryParams,
  CreateWeightEntryBody,
  UpdateWeightEntryParams,
  UpdateWeightEntryBody,
  DeleteWeightEntryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function checkMemberOwnership(memberId: number, userId: number, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const [m] = await db
    .select({ id: familyMembersTable.id })
    .from(familyMembersTable)
    .where(and(eq(familyMembersTable.id, memberId), eq(familyMembersTable.userId, userId)));
  return !!m;
}

function formatEntry(entry: typeof weightEntriesTable.$inferSelect) {
  return {
    id: entry.id,
    memberId: entry.memberId,
    weightKg: entry.weightKg,
    recordedAt: entry.recordedAt,
    note: entry.note,
    createdAt: entry.createdAt,
  };
}

router.get("/weight", requireAuth, async (req, res): Promise<void> => {
  const qp = ListWeightEntriesQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: "memberId is required" });
    return;
  }
  const memberId = qp.data.memberId;
  const userId = req.session.userId!;
  const isAdmin = req.session.role === "admin";

  if (!(await checkMemberOwnership(memberId, userId, isAdmin))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const entries = await db
    .select()
    .from(weightEntriesTable)
    .where(eq(weightEntriesTable.memberId, memberId))
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
  const isAdmin = req.session.role === "admin";

  if (!(await checkMemberOwnership(parsed.data.memberId, userId, isAdmin))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [entry] = await db
    .insert(weightEntriesTable)
    .values({
      memberId: parsed.data.memberId,
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
  const isAdmin = req.session.role === "admin";

  const [existing] = await db.select().from(weightEntriesTable).where(eq(weightEntriesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }
  if (!(await checkMemberOwnership(existing.memberId, userId, isAdmin))) { res.status(403).json({ error: "Access denied" }); return; }

  const updates: Partial<typeof weightEntriesTable.$inferInsert> = {};
  if (parsed.data.weightKg !== undefined) updates.weightKg = parsed.data.weightKg;
  if (parsed.data.recordedAt !== undefined) updates.recordedAt = new Date(parsed.data.recordedAt);
  if (parsed.data.note !== undefined) updates.note = parsed.data.note;

  const [entry] = await db.update(weightEntriesTable).set(updates).where(eq(weightEntriesTable.id, params.data.id)).returning();
  res.json(formatEntry(entry));
});

router.delete("/weight/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteWeightEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const userId = req.session.userId!;
  const isAdmin = req.session.role === "admin";

  const [existing] = await db.select().from(weightEntriesTable).where(eq(weightEntriesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }
  if (!(await checkMemberOwnership(existing.memberId, userId, isAdmin))) { res.status(403).json({ error: "Access denied" }); return; }

  await db.delete(weightEntriesTable).where(eq(weightEntriesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
