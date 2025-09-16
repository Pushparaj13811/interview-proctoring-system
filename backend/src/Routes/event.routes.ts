import { Router } from "express";
import EventController from "../Controllers/event.controller";

const router = Router();
const controller = new EventController();

router.post("/", controller.log);
router.post("/batch", controller.logBatch);
router.get("/recent", controller.getRecent);
router.get("/:sessionId", controller.getBySession);
router.get("/:sessionId/type", controller.getByType);
router.get("/:sessionId/filtered", controller.getFiltered);
router.get("/:sessionId/statistics", controller.getStatistics);

export default router;
