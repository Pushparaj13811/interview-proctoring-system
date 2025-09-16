import dotenv from "dotenv";
import http from "http";
import App from "./app";

dotenv.config();

const PORT = process.env.PORT || 4000;

const server = http.createServer(new App().app);

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

process.on("SIGINT", () => {
  console.log("\n🛑 Server shutting down...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});
