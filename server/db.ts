import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Insurance: a pg Pool emits an asynchronous 'error' event when an idle client
// loses its connection. With no listener, Node treats it as unhandled and
// crash-loops the process (the stack lands deep in bundled pg). Log instead.
pool.on("error", (err) => {
  console.error("[pg] idle client error:", err.message);
});

export const db = drizzle(pool, { schema });
