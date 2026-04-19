import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import familyMembersRouter from "./family-members";
import weightRouter from "./weight";
import lengthRouter from "./length";
import periodRouter from "./period";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(familyMembersRouter);
router.use(weightRouter);
router.use(lengthRouter);
router.use(periodRouter);
router.use(statsRouter);

export default router;
