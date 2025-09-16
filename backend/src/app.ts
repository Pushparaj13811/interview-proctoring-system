import express, { type Application, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import AppError from "./Utils/appError";
import ApiResponse from "./Utils/apiResponse";

class App {
    public app: Application;

    constructor() {
        this.app = express();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
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
        this.app.get("/", (req: Request, res: Response) => {
            res.status(200).json({ message: "Server is running 🚀" });
        });
    }

    private initializeErrorHandling(): void {
        this.app.all("*", (req, res, next) => {
            next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
        });

        this.app.use(
            (err: any, req: Request, res: Response, next: NextFunction) => {
                const statusCode = err.statusCode || 500;
                const message = err.message || "Internal Server Error";

                res.status(statusCode).json(ApiResponse.error(message));
            }
        );
    }
}

export default App;
