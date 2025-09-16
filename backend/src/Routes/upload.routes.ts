import { Router } from "express";
import UploadController from "../Controllers/upload.controller";
import { videoUpload, imageUpload, memoryUpload } from "../Middlewares/multer.middleware";

const router = Router();
const controller = new UploadController();

// Regular video upload (using disk storage)
router.post("/video/:sessionId", videoUpload.single('video'), controller.uploadVideo);

// Video upload from URL (no file upload needed)
router.post("/video-url/:sessionId", controller.uploadVideoFromUrl);

// Image/snapshot upload (using disk storage)
router.post("/snapshot/:sessionId/:eventId", imageUpload.single('image'), controller.uploadSnapshot);

// Legacy memory upload endpoint (for backward compatibility)
router.post("/video-memory/:sessionId", memoryUpload.single('video'), controller.uploadVideo);

// Cleanup and maintenance endpoints
router.post("/cleanup", controller.runCleanup);
router.get("/cleanup/stats", controller.getCleanupStats);

// Progressive upload endpoints
router.post("/progressive/init/:sessionId", controller.initializeProgressiveUpload);
router.post("/progressive/chunk/:uploadId", memoryUpload.single('chunk'), controller.uploadProgressiveChunk);
router.get("/progressive/progress/:uploadId", controller.getProgressiveUploadProgress);
router.post("/progressive/resume", controller.resumeProgressiveUpload);
router.get("/progressive/missing/:uploadId", controller.getMissingChunks);
router.get("/progressive/active", controller.getActiveProgressiveUploads);

export default router;