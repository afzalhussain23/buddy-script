import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { MIN_PASSWORD_LENGTH, signUpSchema } from "@/lib/validation";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    additionalFields: {
      firstName: { type: "string", required: true, input: true },
      lastName: { type: "string", required: true, input: true },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // TODO: gate sign-in on email verification before launch
    minPasswordLength: MIN_PASSWORD_LENGTH,
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
  hooks: {
    // Server-side validation for email sign-up, and derive `name` from the
    // required first/last name fields so it is always the concatenation.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const result = signUpSchema.safeParse(ctx.body);
      if (!result.success) {
        throw new APIError("BAD_REQUEST", {
          message:
            result.error.issues[0]?.message ?? "Invalid registration details",
        });
      }
      const { firstName, lastName } = result.data;
      return {
        context: {
          ...ctx,
          body: {
            ...ctx.body,
            name: `${firstName} ${lastName}`,
          },
        },
      };
    }),
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
