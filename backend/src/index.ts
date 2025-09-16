import dotenv from "dotenv";
import http from "http";
import App from "./app";
import prisma from "./Config/db";

dotenv.config();

const PORT = process.env.PORT || 4000;
const appInstance = new App();
const server = http.createServer(appInstance.app);

server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    try {
        await prisma.$disconnect();
        console.log("Prisma disconnected");
        server.close(() => {
            console.log("Server closed");
            process.exit(0);
        });
    } catch (err) {
        console.error("Error during shutdown:", err);
        process.exit(1);
    }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
