import express, { type Application, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import prisma from "./Config/db";

import AppError from "./Utils/appError";
import ApiResponse from "./Utils/apiResponse";

import routes from "./Routes";

class App {
    public app: Application;
    private readonly apiVersion = "/api/v1";

    constructor() {
        this.app = express();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
        this.initializePrisma();
    }

    private initializeMiddlewares(): void {
        this.app.use(cors());
        this.app.use(helmet());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        if (process.env.NODE_ENV !== "test") {
            this.app.use(morgan("dev"));
        }
    }

    private initializeRoutes(): void {
        // Health check
        this.app.get("/", (req: Request, res: Response) => {
            res.status(200).json({ message: "Server is running 🚀" });
        });

        // API routes
        this.app.use(this.apiVersion, routes);
    }

    private initializeErrorHandling(): void {
        // 404 handler for unmatched routes
        this.app.use((req, res, next) => {
            next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
        });

        // Global error handler
        this.app.use(
            (err: Error & { statusCode?: number }, req: Request, res: Response, next: NextFunction) => {
                const statusCode = err.statusCode || 500;
                const message = err.message || "Internal Server Error";

                res.status(statusCode).json(ApiResponse.error(message));
            }
        );
    }

    private async initializePrisma(): Promise<void> {
        try {
            await prisma.$connect();
            console.log("Prisma connected to database");
        } catch (error) {
            console.error("Failed to connect Prisma:", error);
            process.exit(1);
        }
    }
}

export default App;
