import dotenv from "dotenv";
import http from "http";
import App from "./app";
import prisma from "./Config/db";
import websocketService from "./Services/websocket.service";
import CleanupService from "./Services/cleanup.service";

dotenv.config();

const PORT = process.env.PORT || 4000;
const appInstance = new App();
const server = http.createServer(appInstance.app);

// Initialize WebSocket server
websocketService.initialize(server);

// Initialize cleanup service
const cleanupService = CleanupService.getInstance();
cleanupService.startAutoCleanup(6); // Run cleanup every 6 hours

server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔌 WebSocket server listening on ws://localhost:${PORT}/ws`);
    console.log(`🧹 Cleanup service started with 6h interval`);
});

const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    try {
        // Stop cleanup service
        cleanupService.stopAutoCleanup();
        console.log("Cleanup service stopped");

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
