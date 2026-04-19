import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, lengthEntriesTable, familyMembersTable } from "@workspace/db";
import {
  ListLengthEntriesQueryParams,
  CreateLengthEntryBody,
  UpdateLengthEntryParams,
  UpdateLengthEntryBody,
  DeleteLengthEntryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function checkMemberOwnership(memberId: number, userId: number, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const [m] = await db.select({ id: familyMembersTable.id }).from(familyMembersTable).where(and(eq(familyMembersTable.id, memberId), eq(familyMembersTable.userId, userId)));
  return !!m;
}

function formatEntry(entry: typeof lengthEntriesTable.$inferSelect) {
  return { id: entry.id, memberId: entry.memberId, lengthCm: entry.lengthCm, recordedAt: entry.recordedAt, note: entry.note, createdAt: entry.createdAt };
}

router.get("/length", requireAuth, async (req, res): Promise<void> => {
  const qp = ListLengthEntriesQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: "memberId is required" }); return; }
  const memberId = qp.data.memberId;
  const userId = req.session.userId!;
  const isAdmin = req.session.role === "admin";
  if (!(await checkMemberOwnership(memberId, userId, isAdmin))) { res.status(403).json({ error: "Access denied" }); return; }
  const entries = await db.select().from(lengthEntriesTable).where(eq(lengthEntriesTable.memberId, memberId)).orderBy(desc(lengthEntriesTable.recordedAt));
  res.json(entries.map(formatEntry));
});

router.post("/length", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLengthEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userId = req.session.userId!;
  const isAdmin = req.session.role === "admin";
  if (!(await checkMemberOwnership(parsed.data.memberId, userId, isAdmin))) { res.status(403).json({ error: "Access denied" }); return; }
  const [entry] = await db.insert(lengthEntriesTable).values({
    memberId: parsed.data.memberId,
    lengthCm: parsed.data.lengthCm,
    recordedAt: new Date(parsed.data.recordedAt),
    note: parsed.data.note ?? null,
  }).returning();
  res.status(201).json(formatEntry(entry));
});

router.patch("/length/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLengthEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateLengthEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userId = req.session.userId!;
  const isAdmin = req.session.role === "admin";
  const [existing] = await db.select().from(lengthEntriesTable).where(eq(lengthEntriesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }
  if (!(await checkMemberOwnership(existing.memberId, userId, isAdmin))) { res.status(403).json({ error: "Access denied" }); return; }
  const updates: Partial<typeof lengthEntriesTable.$inferInsert> = {};
  if (parsed.data.lengthCm !== undefined) updates.lengthCm = parsed.data.lengthCm;
  if (parsed.data.recordedAt !== undefined) updates.recordedAt = new Date(parsed.data.recordedAt);
  if (parsed.data.note !== undefined) updates.note = parsed.data.note;
  const [entry] = await db.update(lengthEntriesTable).set(updates).where(eq(lengthEntriesTable.id, params.data.id)).returning();
  res.json(formatEntry(entry));
});

router.delete("/length/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteLengthEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.session.userId!;
  const isAdmin = req.session.role === "admin";
  const [existing] = await db.select().from(lengthEntriesTable).where(eq(lengthEntriesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }
  if (!(await checkMemberOwnership(existing.memberId, userId, isAdmin))) { res.status(403).json({ error: "Access denied" }); return; }
  await db.delete(lengthEntriesTable).where(eq(lengthEntriesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
