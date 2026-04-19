import { Router, type IRouter } from "express";
import { count, desc } from "drizzle-orm";
import { db, usersTable, familyMembersTable, weightEntriesTable, lengthEntriesTable, periodEntriesTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role, status: user.status, createdAt: user.createdAt };
}

router.get("/stats/admin-overview", requireAdmin, async (req, res): Promise<void> => {
  const allUsers = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u) => u.status === "active").length;
  const pendingUsers = allUsers.filter((u) => u.status === "pending").length;
  const suspendedUsers = allUsers.filter((u) => u.status === "suspended").length;

  const [fmCount] = await db.select({ count: count() }).from(familyMembersTable);
  const [wCount] = await db.select({ count: count() }).from(weightEntriesTable);
  const [lCount] = await db.select({ count: count() }).from(lengthEntriesTable);
  const [pCount] = await db.select({ count: count() }).from(periodEntriesTable);

  res.json({
    totalUsers,
    activeUsers,
    pendingUsers,
    suspendedUsers,
    totalFamilyMembers: Number(fmCount?.count ?? 0),
    totalWeightEntries: Number(wCount?.count ?? 0),
    totalLengthEntries: Number(lCount?.count ?? 0),
    totalPeriodEntries: Number(pCount?.count ?? 0),
  });
});

export default router;
