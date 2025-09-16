import { Router } from "express";
import SessionController from "../Controllers/session.controller";

const router = Router();
const controller = new SessionController();

router.post("/", controller.create);
router.get("/", controller.getAll);
router.get("/active", controller.getActive);
router.get("/:id", controller.getById);
router.post("/:id/end", controller.end);
router.put("/:id/video", controller.updateVideo);
router.get("/:id/score", controller.calculateScore);
router.get("/candidate/:candidateId", controller.getByCandidate);

export default router;
