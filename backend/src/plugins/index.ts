import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";
import * as dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

// Create the connection pool
export const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    // Neon (and Vercel) requires SSL.
    // 'rejectUnauthorized: false' is a quick setup for dev.
    // For production, you might want to use Vercel's integrated Neon setup.
    rejectUnauthorized: false,
  },
});

// Create the Drizzle instance, passing the pool and schema
export const db = drizzle(pool, { schema });
