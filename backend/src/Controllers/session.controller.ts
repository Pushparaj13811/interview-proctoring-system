import type { Request, Response } from "express";
import asyncHandler from "../Utils/asyncHandler";
import ApiResponse from "../Utils/apiResponse";
import AppError from "../Utils/appError";
import SessionService from "../Services/session.service";

const service = new SessionService();

class SessionController {
    create = asyncHandler(async (req: Request, res: Response) => {
        const { candidateId, videoUrl } = req.body;
        if (!candidateId) {
            throw new AppError("Candidate ID is required", 400);
        }

        const session = await service.create({ candidateId, videoUrl });
        res.status(201).json(ApiResponse.success(session, "Session started successfully"));
    });

    end = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        let { integrityScore } = req.body;

        if (!id) {
            throw new AppError("Session ID is required", 400);
        }

        if (integrityScore === undefined || integrityScore === null) {
            integrityScore = await service.calculateIntegrityScore(id as string);
        }

        const session = await service.end(id as string, integrityScore);
        if (!session) throw new AppError(`Session with ID ${id} not found`, 404);

        res.json(ApiResponse.success(session, "Session ended successfully"));
    });

    getById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        if (!id) {
            throw new AppError("Session ID is required", 400);
        }

        const session = await service.getById(id as string);
        if (!session) throw new AppError(`Session with ID ${id} not found`, 404);

        res.json(ApiResponse.success(session, "Session fetched successfully"));
    });

    getAll = asyncHandler(async (_req: Request, res: Response) => {
        const sessions = await service.getAll();
        res.json(ApiResponse.success(sessions, "Sessions fetched successfully"));
    });

    getByCandidate = asyncHandler(async (req: Request, res: Response) => {
        const { candidateId } = req.params;
        if (!candidateId) {
            throw new AppError("Candidate ID is required", 400);
        }

        const sessions = await service.getByCandidate(candidateId as string);
        res.json(ApiResponse.success(sessions, "Sessions fetched successfully"));
    });

    updateVideo = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { videoUrl } = req.body;

        if (!id) {
            throw new AppError("Session ID is required", 400);
        }

        if (!videoUrl) {
            throw new AppError("Video URL is required", 400);
        }

        const session = await service.updateVideoUrl(id as string, videoUrl);
        res.json(ApiResponse.success(session, "Video URL updated successfully"));
    });

    getActive = asyncHandler(async (_req: Request, res: Response) => {
        const sessions = await service.getActive();
        res.json(ApiResponse.success(sessions, "Active sessions fetched successfully"));
    });

    calculateScore = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        if (!id) {
            throw new AppError("Session ID is required", 400);
        }

        const score = await service.calculateIntegrityScore(id as string);
        res.json(ApiResponse.success({ score }, "Integrity score calculated successfully"));
    });
}

export default SessionController;
