import Fastify, { FastifyInstance } from "fastify";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import dbPlugin from "./plugins/db";
import { coinRoutes } from "./routes/coins.routes";
import { chatRoutes } from "./routes/chat.routes";
import { authRoutes } from "./routes/auth.routes";
import { favoritesRoutes } from "./routes/favorites.routes";

// Load environment variables from .env file
dotenv.config();

const server: FastifyInstance = Fastify({
  logger: true, // Enable logging
});

// Register the database plugin
server.register(dbPlugin);

// Enable CORS for frontend
server.register(cors, {
  origin: true,
});

// Register routes
server.register(coinRoutes);
server.register(chatRoutes);
server.register(authRoutes);
server.register(favoritesRoutes);

// Basic route to check if the server is up
server.get("/", async (request, reply) => {
  return { hello: "world", message: "Crypto Dashboard API is running" };
});

// Run the server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await server.listen({ port: port, host: "0.0.0.0" });
    server.log.info(`Server listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
