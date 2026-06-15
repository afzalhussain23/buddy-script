import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as authSchema from "./auth";
import * as socialSchema from "./social";

const schema = { ...authSchema, ...socialSchema };
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const sql = neon(databaseUrl);

export const db = drizzle({ client: sql, schema });
