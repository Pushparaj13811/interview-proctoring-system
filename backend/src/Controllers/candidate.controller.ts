import type { Request, Response } from "express";
import asyncHandler from "../Utils/asyncHandler";
import ApiResponse from "../Utils/apiResponse";
import AppError from "../Utils/appError";
import CandidateService from "../Services/candidate.service";

const service = new CandidateService();

class CandidateController {
    create = asyncHandler(async (req: Request, res: Response) => {
        const { name, email } = req.body;

        if (!name) {
            throw new AppError("Candidate name is required", 400);
        }

        if (email) {
            const existing = await service.getByEmail(email);
            if (existing) {
                throw new AppError("Candidate with this email already exists", 409);
            }
        }

        const candidate = await service.create({ name, email });
        res.status(201).json(ApiResponse.success(candidate, "Candidate created successfully"));
    });

    getAll = asyncHandler(async (_req: Request, res: Response) => {
        const candidates = await service.getAll();
        res.json(ApiResponse.success(candidates, "Candidates fetched successfully"));
    });

    getById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const candidate = await service.getById(id as string);

        if (!candidate) {
            throw new AppError(`Candidate with ID ${id} not found`, 404);
        }

        res.json(ApiResponse.success(candidate, "Candidate fetched successfully"));
    });

    update = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { name, email } = req.body;

        if (!id) {
            throw new AppError("Candidate ID is required", 400);
        }

        if (email) {
            const existing = await service.getByEmail(email);
            if (existing && existing.id !== id) {
                throw new AppError("Email already in use by another candidate", 409);
            }
        }

        const candidate = await service.update(id as string, { name, email });
        res.json(ApiResponse.success(candidate, "Candidate updated successfully"));
    });

    delete = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        if (!id) {
            throw new AppError("Candidate ID is required", 400);
        }

        const existing = await service.getById(id as string);
        if (!existing) {
            throw new AppError(`Candidate with ID ${id} not found`, 404);
        }

        await service.delete(id as string);
        res.json(ApiResponse.success(null, "Candidate deleted successfully"));
    });
}

export default CandidateController;
