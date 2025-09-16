import { Router } from "express";
import ReportController from "../Controllers/report.controller";

const router = Router();
const controller = new ReportController();

router.post("/", controller.create);
router.get("/session/:sessionId", controller.getBySession);
router.get("/session/:sessionId/pdf", controller.generatePDF);
router.get("/session/:sessionId/csv", controller.generateCSV);
router.get("/session/:sessionId/json", controller.generateJSON);
router.get("/:id", controller.getById);
router.delete("/:id", controller.delete);

export default router;
