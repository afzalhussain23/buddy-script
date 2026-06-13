import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
  },
  advanced: {
    // On serverless, ensure background email sends finish before the function
    // is frozen. `after` works on both Vercel and self-hosted Next.js.
    backgroundTasks: {
      handler: (promise) => {
        after(promise);
      },
    },
  },
  // TODO: configure trustedOrigins before deploying to a real domain
  // (e.g. trustedOrigins: ["https://yourdomain.com"]) to avoid "Invalid Origin" errors.
  plugins: [nextCookies()], // make sure this is the last plugin in the array
});
