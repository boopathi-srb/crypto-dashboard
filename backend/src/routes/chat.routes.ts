import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { parseQuery } from "../services/chat.service";

interface ChatRequestBody {
  query: string;
}

export async function chatRoutes(fastify: FastifyInstance) {
  // POST /api/chat - Chat assistant endpoint
  fastify.post<{ Body: ChatRequestBody }>(
    "/api/chat",
    async (request: FastifyRequest<{ Body: ChatRequestBody }>, reply: FastifyReply) => {
      try {
        const { query } = request.body;

        if (!query || typeof query !== "string" || query.trim().length === 0) {
          return reply.status(400).send({
            error: "Invalid request. 'query' field is required and must be a non-empty string.",
          });
        }

        // Parse the query using our rule-based chat service
        const result = await parseQuery(query.trim(), request.server.db);

        return reply.send({
          success: true,
          answer: result.answer,
          data: result.data || null,
        });
      } catch (error) {
        request.server.log.error(error, "Error processing chat query");
        return reply.status(500).send({
          error: "Failed to process chat query",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}

