import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import dbPlugin from "../src/plugins/db";
import { coinRoutes } from "../src/routes/coins.routes";
import { chatRoutes } from "../src/routes/chat.routes";
import { authRoutes } from "../src/routes/auth.routes";
import { favoritesRoutes } from "../src/routes/favorites.routes";

let app: FastifyInstance | null = null;

async function buildApp() {
  if (app) {
    return app;
  }

  app = Fastify({
    logger: false, // Disable logger in serverless
  });

  // Register the database plugin
  await app.register(dbPlugin);

  // Enable CORS for frontend
  await app.register(cors, {
    origin: true,
  });

  // Register routes
  await app.register(coinRoutes);
  await app.register(chatRoutes);
  await app.register(authRoutes);
  await app.register(favoritesRoutes);

  // Basic route to check if the server is up
  app.get("/", async (request, reply) => {
    return { hello: "world", message: "Crypto Dashboard API is running" };
  });

  await app.ready();
  return app;
}

export default async function handler(req: any, res: any) {
  const fastify = await buildApp();

  // Handle the request through Fastify
  fastify.server.emit("request", req, res);
}
