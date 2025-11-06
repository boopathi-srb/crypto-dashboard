import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

// ------ FIX 3: Simplify the import path ------
// TypeScript's module resolution will find 'index.ts'
// inside the '../db' directory automatically.
import { db, pool } from "../db";
// ------------------------------------------------

import { NodePgDatabase } from "drizzle-orm/node-postgres";

// Define the type for our db instance
// We use 'typeof import' to get the full schema type
type DbType = NodePgDatabase<typeof import("../db/schema")>;

// Augment the FastifyInstance interface
declare module "fastify" {
  interface FastifyInstance {
    db: DbType;
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Decorate the fastify instance with the 'db' client
  fastify.decorate("db", db);

  // Add a hook to close the pool when the server shuts down
  fastify.addHook("onClose", (instance, done) => {
    pool.end((err?: Error) => {
      if (err) {
        instance.log.error(err, "Error closing database pool");
      } else {
        instance.log.info("Database pool closed");
      }
      done(err);
    });
  });
};

// Export the plugin using fastify-plugin
export default fp(dbPlugin);
