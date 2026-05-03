import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!, {
  ssl: { rejectUnauthorized: false },
  max: 1,        // one connection per serverless invocation
  prepare: false, // required for Supabase transaction-mode pooler (port 6543)
});

export const db = drizzle(client, { schema });
