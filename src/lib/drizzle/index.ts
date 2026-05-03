import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!, {
  ssl: { rejectUnauthorized: false },
  max: 1,              // one connection per serverless invocation
  prepare: false,      // required for Supabase transaction-mode pooler (port 6543)
  connect_timeout: 10, // fail fast instead of hanging 300s if DB is unreachable
  idle_timeout: 20,    // release idle connections quickly in serverless
});

export const db = drizzle(client, { schema });
