import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/auth";
import { sendEmail } from "@/lib/email";
import { authRedis } from "@/lib/redis";
import {
  getFieldErrors,
  getValidationMessage,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  signInEmailSchema,
  signUpEmailSchema,
} from "@/lib/validation";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  // Back rate limiting (and other ephemeral state) with Upstash Redis so limits
  // hold across serverless instances instead of Better Auth's default per-process
  // in-memory store. authRedis disables auto-deserialization to honor the
  // string-in/string-out secondaryStorage contract.
  secondaryStorage: {
    get: (key) => authRedis.get<string>(key),
    set: async (key, value, ttl) => {
      await (ttl
        ? authRedis.set(key, value, { ex: ttl })
        : authRedis.set(key, value));
    },
    delete: async (key) => {
      await authRedis.del(key);
    },
  },
  rateLimit: {
    // Enable in every environment (not just production) so behavior matches the
    // app's own Upstash limiter. Keeps Better Auth's hardened per-path defaults
    // (sign-in/sign-up 3/10s, password reset 3/60s), keyed by IP.
    enabled: true,
    storage: "secondary-storage",
  },
  user: {
    additionalFields: {
      firstName: { type: "string", required: true, input: true },
      lastName: { type: "string", required: true, input: true },
      acceptedTerms: {
        type: "boolean",
        required: true,
        input: true,
        returned: false,
      },
      termsAcceptedAt: {
        type: "date",
        required: false,
        input: false,
        returned: false,
        defaultValue: () => new Date(),
      },
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
    maxPasswordLength: MAX_PASSWORD_LENGTH,
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
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email") {
        const result = signInEmailSchema.safeParse(ctx.body);
        if (result.success) return;
        throw new APIError("BAD_REQUEST", {
          message: getValidationMessage(
            result.error,
            "Please correct the highlighted fields.",
          ),
          fieldErrors: getFieldErrors(result.error),
        });
      }

      if (ctx.path !== "/sign-up/email") return;
      const result = signUpEmailSchema.safeParse(ctx.body);
      if (!result.success) {
        throw new APIError("BAD_REQUEST", {
          message: getValidationMessage(
            result.error,
            "Please correct the highlighted fields.",
          ),
          fieldErrors: getFieldErrors(result.error),
        });
      }
      const {
        firstName,
        lastName,
        email,
        password,
        acceptedTerms,
        image,
        callbackURL,
        rememberMe,
      } = result.data;
      return {
        context: {
          ...ctx,
          body: {
            email,
            password,
            firstName,
            lastName,
            acceptedTerms,
            image,
            callbackURL,
            rememberMe,
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
