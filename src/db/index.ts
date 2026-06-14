import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as authSchema from "./auth";
import * as socialSchema from "./social";

const schema = { ...authSchema, ...socialSchema };

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle({ client: sql, schema });
