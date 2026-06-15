import "dotenv/config";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js stores local env vars in .env.local
config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

export default defineConfig({
  schema: ["./src/db/auth.ts", "./src/db/social.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
