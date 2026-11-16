import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Conexão com o Neon (Postgres). O app roda como processo Node comum na
 * Hostinger (não é serverless), então reaproveitamos um único Pool — inclusive
 * entre recarregamentos do modo de desenvolvimento.
 */
const globalParaPool = globalThis as unknown as { __pool?: Pool };

const pool = globalParaPool.__pool ?? new Pool({ connectionString: env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalParaPool.__pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
export type Db = typeof db;
