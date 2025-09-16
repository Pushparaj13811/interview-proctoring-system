import type { Request, Response } from "express";
import asyncHandler from "../Utils/asyncHandler";
import ApiResponse from "../Utils/apiResponse";
import AppError from "../Utils/appError";
import ReportService from "../Services/report.service";
import { v2 as cloudinary } from "cloudinary";
import type { CloudinaryUploadResult } from "../Utils/cloudinary.util";

const service = new ReportService();

class ReportController {
    generatePDF = asyncHandler(async (req: Request, res: Response) => {
        const { sessionId } = req.params;

        if (!sessionId) {
            throw new AppError("Session ID is required", 400);
        }

        try {
            const reportData = await service.getReportData(sessionId as string);
            const pdfBuffer = service.generatePDF(reportData);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report-${sessionId}.pdf`);
            res.send(pdfBuffer);
        } catch (error: any) {
            throw new AppError(error.message || "Failed to generate PDF report", 500);
        }
    });

    generateCSV = asyncHandler(async (req: Request, res: Response) => {
        const { sessionId } = req.params;

        if (!sessionId) {
            throw new AppError("Session ID is required", 400);
        }

        try {
            const reportData = await service.getReportData(sessionId as string);
            const csvContent = service.generateCSV(reportData);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=report-${sessionId}.csv`);
            res.send(csvContent);
        } catch (error: any) {
            throw new AppError(error.message || "Failed to generate CSV report", 500);
        }
    });

    generateJSON = asyncHandler(async (req: Request, res: Response) => {
        const { sessionId } = req.params;

        if (!sessionId) {
            throw new AppError("Session ID is required", 400);
        }

        const reportData = await service.getReportData(sessionId as string);
        res.json(ApiResponse.success(reportData, "Report data fetched successfully"));
    });

    create = asyncHandler(async (req: Request, res: Response) => {
        const { sessionId, format } = req.body;

        if (!sessionId || !format) {
            throw new AppError("Session ID and format are required", 400);
        }

        let fileUrl = '';

        try {
            const reportData = await service.getReportData(sessionId);

            if (format === 'pdf') {
                const pdfBuffer = service.generatePDF(reportData);
                // Upload to Cloudinary if configured
                if (process.env.CLOUDINARY_CLOUD_NAME) {
                    const uploadResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            {
                                resource_type: 'raw',
                                public_id: `reports/pdf/${sessionId}-${Date.now()}`,
                                format: 'pdf'
                            },
                            (error, result) => {
                                if (error) reject(error);
                                else if (result) resolve(result as CloudinaryUploadResult);
                                else reject(new Error('Upload failed - no result'));
                            }
                        );
                        uploadStream.end(pdfBuffer);
                    });
                    fileUrl = uploadResult.secure_url;
                }
            } else if (format === 'csv') {
                const csvContent = service.generateCSV(reportData);
                // Upload to Cloudinary if configured
                if (process.env.CLOUDINARY_CLOUD_NAME) {
                    const uploadResult = await cloudinary.uploader.upload(
                        `data:text/csv;base64,${Buffer.from(csvContent).toString('base64')}`,
                        {
                            resource_type: 'raw',
                            public_id: `reports/csv/${sessionId}-${Date.now()}`,
                            format: 'csv'
                        }
                    );
                    fileUrl = uploadResult.secure_url;
                }
            }

            const report = await service.create({ sessionId, format, fileUrl });
            res.status(201).json(ApiResponse.success(report, "Report created successfully"));
        } catch (error: any) {
            throw new AppError(error.message || "Failed to create report", 500);
        }
    });

    getBySession = asyncHandler(async (req: Request, res: Response) => {
        const { sessionId } = req.params;

        if (!sessionId) {
            throw new AppError("Session ID is required", 400);
        }

        const reports = await service.getBySession(sessionId as string);
        res.json(ApiResponse.success(reports, "Reports fetched successfully"));
    });

    getById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        if (!id) {
            throw new AppError("Report ID is required", 400);
        }

        const report = await service.getById(id as string);

        if (!report) {
            throw new AppError(`Report with ID ${id} not found`, 404);
        }

        res.json(ApiResponse.success(report, "Report fetched successfully"));
    });

    delete = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        if (!id) {
            throw new AppError("Report ID is required", 400);
        }

        await service.delete(id as string);
        res.json(ApiResponse.success(null, "Report deleted successfully"));
    });
}

export default ReportController;
