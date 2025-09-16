import type { Request, Response } from "express";
import asyncHandler from "../Utils/asyncHandler";
import ApiResponse from "../Utils/apiResponse";
import AppError from "../Utils/appError";
import UploadService from "../Services/upload.service";
import SessionService from "../Services/session.service";
import CleanupService from "../Services/cleanup.service";
import ProgressiveUploadManager from "../Utils/progressive-upload.manager";
import CloudinaryUtil from "../Utils/cloudinary.util";

const uploadService = new UploadService();
const sessionService = new SessionService();
const cleanupService = CleanupService.getInstance();
const progressiveUploadManager = ProgressiveUploadManager.getInstance();

class UploadController {
  uploadVideo = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new AppError("Session ID is required", 400);
    }

    if (!req.file) {
      throw new AppError("Video file is required", 400);
    }

    try {
      // Use file path if available (disk storage), otherwise use buffer (memory storage)
      const videoSource = req.file.path || req.file.buffer;
      const videoUrl = await uploadService.uploadVideo(videoSource, sessionId);
      const session = await sessionService.updateVideoUrl(sessionId, videoUrl);

      res.json(ApiResponse.success(
        { videoUrl, session },
        "Video uploaded successfully"
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(errorMessage || "Failed to upload video", 500);
    }
  });

  uploadVideoFromUrl = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { url } = req.body;

    if (!sessionId) {
      throw new AppError("Session ID is required", 400);
    }

    if (!url) {
      throw new AppError("Video URL is required", 400);
    }

    try {
      const videoUrl = await uploadService.uploadVideoFromUrl(url, sessionId);
      const session = await sessionService.updateVideoUrl(sessionId, videoUrl);

      res.json(ApiResponse.success(
        { videoUrl, session },
        "Video uploaded successfully"
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(errorMessage || "Failed to upload video", 500);
    }
  });

  uploadSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId, eventId } = req.params;

    if (!sessionId || !eventId) {
      throw new AppError("Session ID and Event ID are required", 400);
    }

    if (!req.file) {
      throw new AppError("Image file is required", 400);
    }

    try {
      // Use file path if available (disk storage), otherwise use buffer (memory storage)
      const imageSource = req.file.path || req.file.buffer;
      const imageUrl = await uploadService.uploadImage(imageSource, sessionId, eventId);

      res.json(ApiResponse.success(
        { imageUrl },
        "Snapshot uploaded successfully"
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(errorMessage || "Failed to upload snapshot", 500);
    }
  });


  // Run cleanup manually
  runCleanup = asyncHandler(async (req: Request, res: Response) => {
    try {
      await cleanupService.runCleanup();

      res.json(ApiResponse.success(
        null,
        "Cleanup completed successfully"
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(errorMessage || "Failed to run cleanup", 500);
    }
  });

  // Get cleanup statistics
  getCleanupStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      const stats = await cleanupService.getCleanupStats();

      res.json(ApiResponse.success(
        stats,
        "Cleanup statistics retrieved successfully"
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(errorMessage || "Failed to get cleanup stats", 500);
    }
  });

  // Initialize progressive upload
  initializeProgressiveUpload = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { totalSize, chunkSize } = req.body;

    if (!sessionId) {
      throw new AppError("Session ID is required", 400);
    }

    if (!totalSize || totalSize <= 0) {
      throw new AppError("Total size must be a positive number", 400);
    }

    try {
      const result = await progressiveUploadManager.initializeUpload(
        sessionId,
        parseInt(totalSize),
        chunkSize ? parseInt(chunkSize) : undefined
      );

      res.json(ApiResponse.success(
        result,
        "Progressive upload initialized successfully"
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(errorMessage || "Failed to initialize progressive upload", 500);
    }
  });

  // Upload progressive chunk
  uploadProgressiveChunk = asyncHandler(async (req: Request, res: Response) => {
    const { uploadId } = req.params;
    const { chunkIndex, chunkHash } = req.body;

    if (!uploadId) {
      throw new AppError("Upload ID is required", 400);
    }

    if (!req.file) {
      throw new AppError("Chunk data is required", 400);
    }

    if (chunkIndex === undefined) {
      throw new AppError("Chunk index is required", 400);
    }

    try {
      const chunkData = req.file.buffer || await require('fs').promises.readFile(req.file.path);

      const result = await progressiveUploadManager.uploadChunk(
        uploadId,
        parseInt(chunkIndex),
        chunkData,
        chunkHash
      );

      // If upload is complete, finalize and upload to Cloudinary
      if (result.isComplete) {
        const mergedData = await progressiveUploadManager.finalizeUpload(uploadId);

        if (mergedData) {
          const videoUrl = await CloudinaryUtil.uploadVideo(mergedData, result.progress.sessionId);
          await sessionService.updateVideoUrl(result.progress.sessionId, videoUrl.secure_url);

          // Clean up progressive upload
          await progressiveUploadManager.cleanupUpload(uploadId);

          res.json(ApiResponse.success({
            ...result,
            videoUrl: videoUrl.secure_url,
            finalized: true
          }, "Progressive upload completed and video uploaded successfully"));
          return;
        }
      }

      res.json(ApiResponse.success(
        result,
        "Chunk uploaded successfully"
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(errorMessage || "Failed to upload chunk", 500);
    }
  });

  // Get progressive upload progress
  getProgressiveUploadProgress = asyncHandler(async (req: Request, res: Response) => {
    const { uploadId } = req.params;

    if (!uploadId) {
      throw new AppError("Upload ID is required", 400);
    }

    try {
      const progress = progressiveUploadManager.getProgress(uploadId);

      res.json(ApiResponse.success(
        progress,
        "Upload progress retrieved successfully"
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(errorMessage || "Failed to get upload progress", 500);
    }
  });

  // Resume progressive upload
  resumeProgressiveUpload = asyncHandler(async (req: Request, res: Response) => {
    const { resumeToken } = req.body;

    if (!resumeToken) {
      throw new AppError("Resume token is required", 400);
    }

    try {
      const progress = await progressiveUploadManager.resumeUpload(resumeToken);

      if (!progress) {
        throw new AppError("Upload session not found or expired", 404);
      }

      res.json(ApiResponse.success(
        progress,
        "Upload session resumed successfully"
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(errorMessage || "Failed to resume upload", 500);
    }
  });

  // Get missing chunks for resumable upload
  getMissingChunks = asyncHandler(async (req: Request, res: Response) => {
    const { uploadId } = req.params;

    if (!uploadId) {
      throw new AppError("Upload ID is required", 400);
    }

    try {
      const missingChunks = progressiveUploadManager.getMissingChunks(uploadId);

      res.json(ApiResponse.success(
        { missingChunks },
        "Missing chunks retrieved successfully"
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(errorMessage || "Failed to get missing chunks", 500);
    }
  });

  // Get all active progressive uploads
  getActiveProgressiveUploads = asyncHandler(async (req: Request, res: Response) => {
    try {
      const activeSessions = progressiveUploadManager.getActiveSessions();

      res.json(ApiResponse.success(
        { sessions: activeSessions },
        "Active upload sessions retrieved successfully"
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(errorMessage || "Failed to get active uploads", 500);
    }
  });
}

export default UploadController;