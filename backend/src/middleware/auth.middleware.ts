import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken } from "../services/auth.service";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Unauthorized. Missing or invalid token." });
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    reply.status(401).send({ error: "Unauthorized. Invalid token." });
    return;
  }

  (request as any).user = decoded;
}

