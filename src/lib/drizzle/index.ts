import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// `max_pipeline` existe en postgres.js (src/index.js) pero falta en sus tipos.
type PostgresOptions = postgres.Options<Record<string, never>> & { max_pipeline: number };

const options: PostgresOptions = {
  ssl: { rejectUnauthorized: false },
  max: 1,              // one connection per serverless invocation
  // SCRUM-270: postgres.js encadena (pipeline) consultas sobre su única conexión y el pooler
  // transaccional de Supabase (:6543) nunca responde las encadenadas: con dos consultas
  // simultáneas todo el proceso se cuelga. Con 0 se envía una consulta por vez.
  max_pipeline: 0,
  prepare: false,      // required for Supabase transaction-mode pooler (port 6543)
  connect_timeout: 10, // fail fast instead of hanging 300s if DB is unreachable
  idle_timeout: 20,    // release idle connections quickly in serverless
};

const client = postgres(process.env.DATABASE_URL!, options);

export const db = drizzle(client, { schema });

// Las transacciones (sql.begin) fallan con max_pipeline: 0 ("Cannot set properties of
// undefined (setting 'onclose')") y con el pipeline por defecto se cuelgan. Van por un
// cliente aparte con max_pipeline: 1; dentro de una transacción las consultas son siempre
// secuenciales, así que no hay encadenamiento. Probado contra el pooler: transacciones y
// consultas simultáneas conviven. Usar `dbTx.transaction(...)`, nunca `db.transaction(...)`.
const txOptions: PostgresOptions = { ...options, max_pipeline: 1 };
const txClient = postgres(process.env.DATABASE_URL!, txOptions);

export const dbTx = drizzle(txClient, { schema });
