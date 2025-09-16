import { Router } from "express";
import CandidateController from "../Controllers/candidate.controller";

const router = Router();
const controller = new CandidateController();

router.post("/", controller.create);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;
