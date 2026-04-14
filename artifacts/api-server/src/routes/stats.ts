import { Router, type IRouter } from "express";
import { eq, count, desc } from "drizzle-orm";
import { db, usersTable, weightEntriesTable, lengthEntriesTable, periodEntriesTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    gender: user.gender,
    status: user.status,
    createdAt: user.createdAt,
  };
}

router.get("/stats/my-summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const weightEntries = await db
    .select()
    .from(weightEntriesTable)
    .where(eq(weightEntriesTable.userId, userId))
    .orderBy(desc(weightEntriesTable.recordedAt))
    .limit(10);

  const lengthEntries = await db
    .select()
    .from(lengthEntriesTable)
    .where(eq(lengthEntriesTable.userId, userId))
    .orderBy(desc(lengthEntriesTable.recordedAt))
    .limit(5);

  const periodEntries = await db
    .select()
    .from(periodEntriesTable)
    .where(eq(periodEntriesTable.userId, userId))
    .orderBy(desc(periodEntriesTable.startDate))
    .limit(6);

  const [weightCount] = await db
    .select({ count: count() })
    .from(weightEntriesTable)
    .where(eq(weightEntriesTable.userId, userId));

  const [lengthCount] = await db
    .select({ count: count() })
    .from(lengthEntriesTable)
    .where(eq(lengthEntriesTable.userId, userId));

  const latestWeight = weightEntries[0]?.weightKg ?? null;
  const prevWeight = weightEntries[1]?.weightKg ?? null;
  const weightTrend = latestWeight !== null && prevWeight !== null
    ? Math.round((latestWeight - prevWeight) * 100) / 100
    : null;

  const latestLength = lengthEntries[0]?.lengthCm ?? null;
  const lastPeriodStart = periodEntries[0]?.startDate ?? null;

  let nextPeriodEstimate: string | null = null;
  let avgCycleLength: number | null = null;

  if (periodEntries.length >= 2) {
    const cycleLengths: number[] = [];
    for (let i = 0; i < periodEntries.length - 1; i++) {
      const current = new Date(periodEntries[i].startDate);
      const next = new Date(periodEntries[i + 1].startDate);
      const diff = Math.abs((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
      cycleLengths.push(diff);
    }
    const avg = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
    avgCycleLength = Math.round(avg);

    if (lastPeriodStart) {
      const lastDate = new Date(lastPeriodStart);
      lastDate.setDate(lastDate.getDate() + avgCycleLength);
      nextPeriodEstimate = lastDate.toISOString().split("T")[0];
    }
  }

  res.json({
    latestWeight,
    weightTrend,
    latestLength,
    weightEntriesCount: Number(weightCount?.count ?? 0),
    lengthEntriesCount: Number(lengthCount?.count ?? 0),
    lastPeriodStart,
    nextPeriodEstimate,
    avgCycleLength,
  });
});

router.get("/stats/admin-overview", requireAdmin, async (req, res): Promise<void> => {
  const allUsers = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));

  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u) => u.status === "active").length;
  const pendingApprovals = allUsers.filter((u) => u.status === "pending").length;
  const suspendedUsers = allUsers.filter((u) => u.status === "suspended").length;

  const [wCount] = await db.select({ count: count() }).from(weightEntriesTable);
  const [lCount] = await db.select({ count: count() }).from(lengthEntriesTable);

  const recentRegistrations = allUsers.slice(0, 5);

  res.json({
    totalUsers,
    activeUsers,
    pendingApprovals,
    suspendedUsers,
    totalWeightEntries: Number(wCount?.count ?? 0),
    totalLengthEntries: Number(lCount?.count ?? 0),
    recentRegistrations: recentRegistrations.map(formatUser),
  });
});

export default router;
