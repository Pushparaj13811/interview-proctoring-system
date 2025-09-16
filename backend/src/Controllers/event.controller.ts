import type { Request, Response } from "express";
import asyncHandler from "../Utils/asyncHandler";
import ApiResponse from "../Utils/apiResponse";
import AppError from "../Utils/appError";
import EventService from "../Services/event.service";
import { type EventType } from "../generated/prisma";

const service = new EventService();

class EventController {
    log = asyncHandler(async (req: Request, res: Response) => {
        const { sessionId, type } = req.body;
        if (!sessionId || !type) {
            throw new AppError("Session ID and Event type are required", 400);
        }

        const event = await service.log(req.body);
        res.status(201).json(ApiResponse.success(event, "Event logged successfully"));
    });

    logBatch = asyncHandler(async (req: Request, res: Response) => {
        const { events } = req.body;

        if (!events || !Array.isArray(events) || events.length === 0) {
            throw new AppError("Events array is required", 400);
        }

        const invalidEvents = events.filter(e => !e.sessionId || !e.type);
        if (invalidEvents.length > 0) {
            throw new AppError("All events must have sessionId and type", 400);
        }

        const result = await service.logBatch(events);
        res.status(201).json(ApiResponse.success(
            { count: result.count },
            `${result.count} events logged successfully`
        ));
    });

    getBySession = asyncHandler(async (req: Request, res: Response) => {
        const { sessionId } = req.params;

        if (!sessionId) {
            throw new AppError("Session ID is required", 400);
        }

        const events = await service.getBySession(sessionId as string);
        res.json(ApiResponse.success(events, "Events fetched successfully"));
    });

    getByType = asyncHandler(async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const { type } = req.query;

        if (!sessionId) {
            throw new AppError("Session ID is required", 400);
        }

        if (!type) {
            throw new AppError("Event type is required", 400);
        }

        const events = await service.getByType(sessionId as string, type as EventType);
        res.json(ApiResponse.success(events, "Events fetched successfully"));
    });

    getFiltered = asyncHandler(async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const { type, startTime, endTime, label } = req.query;

        if (!sessionId) {
            throw new AppError("Session ID is required", 400);
        }

        const filters = {
            ...(type && { type: type as EventType }),
            ...(startTime && { startTime: new Date(startTime as string) }),
            ...(endTime && { endTime: new Date(endTime as string) }),
            ...(label && { label: label as string })
        };

        const events = await service.getFiltered(sessionId as string, filters);
        res.json(ApiResponse.success(events, "Events fetched successfully"));
    });

    getStatistics = asyncHandler(async (req: Request, res: Response) => {
        const { sessionId } = req.params;

        if (!sessionId) {
            throw new AppError("Session ID is required", 400);
        }

        const stats = await service.getStatistics(sessionId as string);
        res.json(ApiResponse.success(stats, "Statistics fetched successfully"));
    });

    getRecent = asyncHandler(async (req: Request, res: Response) => {
        const { limit } = req.query;
        const events = await service.getRecentEvents(limit ? parseInt(limit as string) : 10);
        res.json(ApiResponse.success(events, "Recent events fetched successfully"));
    });
}

export default EventController;
