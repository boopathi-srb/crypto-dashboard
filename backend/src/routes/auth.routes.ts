import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, generateToken } from "../services/auth.service";

interface SignupBody {
  email: string;
  password: string;
  name?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: SignupBody }>(
    "/api/auth/signup",
    async (request: FastifyRequest<{ Body: SignupBody }>, reply: FastifyReply) => {
      try {
        const { email, password, name } = request.body;

        if (!email || !password) {
          return reply.status(400).send({
            error: "Email and password are required",
          });
        }

        if (password.length < 6) {
          return reply.status(400).send({
            error: "Password must be at least 6 characters",
          });
        }

        const existingUser = await request.server.db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (existingUser.length > 0) {
          return reply.status(409).send({
            error: "User with this email already exists",
          });
        }

        const hashedPassword = await hashPassword(password);

        const [newUser] = await request.server.db
          .insert(users)
          .values({
            email: email.toLowerCase(),
            password: hashedPassword,
            name: name || null,
          })
          .returning();

        const token = generateToken(newUser.id, newUser.email);

        return reply.send({
          success: true,
          token,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          },
        });
      } catch (error) {
        request.server.log.error(error, "Error during signup");
        return reply.status(500).send({
          error: "Failed to create user",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  fastify.post<{ Body: LoginBody }>(
    "/api/auth/login",
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      try {
        const { email, password } = request.body;

        if (!email || !password) {
          return reply.status(400).send({
            error: "Email and password are required",
          });
        }

        const [user] = await request.server.db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!user) {
          return reply.status(401).send({
            error: "Invalid email or password",
          });
        }

        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
          return reply.status(401).send({
            error: "Invalid email or password",
          });
        }

        const token = generateToken(user.id, user.email);

        return reply.send({
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        });
      } catch (error) {
        request.server.log.error(error, "Error during login");
        return reply.status(500).send({
          error: "Failed to login",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}

