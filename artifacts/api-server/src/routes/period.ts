import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, periodEntriesTable, familyMembersTable } from "@workspace/db";
import {
  ListPeriodEntriesQueryParams,
  CreatePeriodEntryBody,
  UpdatePeriodEntryParams,
  UpdatePeriodEntryBody,
  DeletePeriodEntryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function checkMemberOwnership(memberId: number, userId: number, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const [m] = await db.select({ id: familyMembersTable.id }).from(familyMembersTable).where(and(eq(familyMembersTable.id, memberId), eq(familyMembersTable.userId, userId)));
  return !!m;
}

async function getFemaleMember(memberId: number) {
  const [m] = await db.select().from(familyMembersTable).where(eq(familyMembersTable.id, memberId));
  return m;
}

function calcDays(startDate: string, endDate: string | null | undefined): number | null {
  if (!endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : null;
}

function formatEntry(entry: typeof periodEntriesTable.$inferSelect) {
  return {
    id: entry.id,
    memberId: entry.memberId,
    startDate: entry.startDate,
    endDate: entry.endDate,
    numberOfDays: entry.numberOfDays,
    note: entry.note,
    createdAt: entry.createdAt,
  };
}

router.get("/period", requireAuth, async (req, res): Promise<void> => {
  const qp = ListPeriodEntriesQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: "memberId is required" }); return; }
  const memberId = qp.data.memberId;
  const userId = req.session.userId!;
  const isAdmin = req.session.role === "admin";
  if (!(await checkMemberOwnership(memberId, userId, isAdmin))) { res.status(403).json({ error: "Access denied" }); return; }
  const member = await getFemaleMember(memberId);
  if (!member || member.gender !== "female") { res.status(403).json({ error: "Period tracking is only available for female members" }); return; }
  const entries = await db.select().from(periodEntriesTable).where(eq(periodEntriesTable.memberId, memberId)).orderBy(desc(periodEntriesTable.startDate));
  res.json(entries.map(formatEntry));
});

router.post("/period", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePeriodEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userId = req.session.userId!;
  const isAdmin = req.session.role === "admin";
  if (!(await checkMemberOwnership(parsed.data.memberId, userId, isAdmin))) { res.status(403).json({ error: "Access denied" }); return; }
  const member = await getFemaleMember(parsed.data.memberId);
  if (!member || member.gender !== "female") { res.status(403).json({ error: "Period tracking is only available for female members" }); return; }
  const numberOfDays = calcDays(parsed.data.startDate, parsed.data.endDate);
  const [entry] = await db.insert(periodEntriesTable).values({
    memberId: parsed.data.memberId,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate ?? null,
    numberOfDays,
    note: parsed.data.note ?? null,
  }).returning();
  res.status(201).json(formatEntry(entry));
});

router.patch("/period/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePeriodEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePeriodEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userId = req.session.userId!;
  const isAdmin = req.session.role === "admin";
  const [existing] = await db.select().from(periodEntriesTable).where(eq(periodEntriesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }
  if (!(await checkMemberOwnership(existing.memberId, userId, isAdmin))) { res.status(403).json({ error: "Access denied" }); return; }
  const updates: Partial<typeof periodEntriesTable.$inferInsert> = {};
  const newStart = parsed.data.startDate ?? existing.startDate;
  const newEnd = parsed.data.endDate !== undefined ? parsed.data.endDate : existing.endDate;
  if (parsed.data.startDate !== undefined) updates.startDate = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) updates.endDate = parsed.data.endDate;
  updates.numberOfDays = calcDays(newStart, newEnd);
  if (parsed.data.note !== undefined) updates.note = parsed.data.note;
  const [entry] = await db.update(periodEntriesTable).set(updates).where(eq(periodEntriesTable.id, params.data.id)).returning();
  res.json(formatEntry(entry));
});

router.delete("/period/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeletePeriodEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const userId = req.session.userId!;
  const isAdmin = req.session.role === "admin";
  const [existing] = await db.select().from(periodEntriesTable).where(eq(periodEntriesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }
  if (!(await checkMemberOwnership(existing.memberId, userId, isAdmin))) { res.status(403).json({ error: "Access denied" }); return; }
  await db.delete(periodEntriesTable).where(eq(periodEntriesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
