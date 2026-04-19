import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { RegisterBody, LoginBody, UpdateMeBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password, displayName } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({
      username,
      passwordHash,
      displayName,
      role: "user",
      status: "pending",
    })
    .returning();

  res.status(201).json({
    user: formatUser(user),
    message: "Registration submitted — awaiting admin approval.",
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));

  if (!user) {
    res.status(400).json({ error: "Invalid username or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Invalid username or password" });
    return;
  }

  if (user.status === "pending") {
    res.status(403).json({ error: "Your registration is pending admin approval." });
    return;
  }

  if (user.status === "suspended") {
    res.status(403).json({ error: "Your account has been suspended." });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;

  res.json({ user: formatUser(user) });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out" });
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(formatUser(user));
});

router.patch("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.displayName) updates.displayName = parsed.data.displayName;

  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword) {
      res.status(400).json({ error: "Current password is required to set a new password" });
      return;
    }
    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }
    updates.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    res.json(formatUser(user));
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.session.userId!)).returning();
  res.json(formatUser(updated));
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

export default router;
