import "dotenv/config";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js stores local env vars in .env.local
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
