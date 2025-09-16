import { Router } from "express";
import candidateRoutes from "./candidate.routes";
import sessionRoutes from "./session.routes";
import eventRoutes from "./event.routes";
import reportRoutes from "./report.routes";
import uploadRoutes from "./upload.routes";

const router = Router();

router.use("/candidates", candidateRoutes);
router.use("/sessions", sessionRoutes);
router.use("/events", eventRoutes);
router.use("/reports", reportRoutes);
router.use("/upload", uploadRoutes);

export default router;
