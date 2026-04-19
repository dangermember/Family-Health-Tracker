import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, familyMembersTable } from "@workspace/db";
import {
  GetFamilyMemberParams,
  UpdateFamilyMemberParams,
  UpdateFamilyMemberBody,
  DeleteFamilyMemberParams,
  CreateFamilyMemberBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function formatMember(m: typeof familyMembersTable.$inferSelect) {
  return {
    id: m.id,
    userId: m.userId,
    name: m.name,
    gender: m.gender,
    dateOfBirth: m.dateOfBirth,
    createdAt: m.createdAt,
  };
}

router.get("/family-members", requireAuth, async (req, res): Promise<void> => {
  const members = await db
    .select()
    .from(familyMembersTable)
    .where(eq(familyMembersTable.userId, req.session.userId!));
  res.json(members.map(formatMember));
});

router.post("/family-members", requireAuth, async (req, res): Promise<void> => {
  const body = CreateFamilyMemberBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [member] = await db
    .insert(familyMembersTable)
    .values({
      userId: req.session.userId!,
      name: body.data.name,
      gender: body.data.gender,
      dateOfBirth: body.data.dateOfBirth ?? null,
    })
    .returning();
  res.status(201).json(formatMember(member));
});

router.get("/family-members/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetFamilyMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [member] = await db
    .select()
    .from(familyMembersTable)
    .where(
      and(
        eq(familyMembersTable.id, params.data.id),
        req.session.role === "admin"
          ? undefined
          : eq(familyMembersTable.userId, req.session.userId!),
      ),
    );
  if (!member) {
    res.status(404).json({ error: "Family member not found" });
    return;
  }
  res.json(formatMember(member));
});

router.patch("/family-members/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateFamilyMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateFamilyMemberBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const existing = await db
    .select()
    .from(familyMembersTable)
    .where(
      and(
        eq(familyMembersTable.id, params.data.id),
        eq(familyMembersTable.userId, req.session.userId!),
      ),
    );
  if (!existing.length) {
    res.status(404).json({ error: "Family member not found" });
    return;
  }
  const updates: Partial<typeof familyMembersTable.$inferInsert> = {};
  if (body.data.name !== undefined) updates.name = body.data.name;
  if (body.data.gender !== undefined) updates.gender = body.data.gender;
  if (body.data.dateOfBirth !== undefined) updates.dateOfBirth = body.data.dateOfBirth ?? null;

  const [updated] = await db
    .update(familyMembersTable)
    .set(updates)
    .where(eq(familyMembersTable.id, params.data.id))
    .returning();
  res.json(formatMember(updated));
});

router.delete("/family-members/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteFamilyMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const existing = await db
    .select()
    .from(familyMembersTable)
    .where(
      and(
        eq(familyMembersTable.id, params.data.id),
        eq(familyMembersTable.userId, req.session.userId!),
      ),
    );
  if (!existing.length) {
    res.status(404).json({ error: "Family member not found" });
    return;
  }
  await db.delete(familyMembersTable).where(eq(familyMembersTable.id, params.data.id));
  res.status(204).send();
});

export default router;
