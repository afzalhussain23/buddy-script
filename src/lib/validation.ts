import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 12;

/**
 * Server-side sign-up payload (what the client actually sends to
 * `/sign-up/email`). `repeatPassword` is intentionally not part of this — it is
 * a client-only concern validated in `registerFormSchema`.
 */
export const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.email("Please enter a valid email address"),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    ),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * Full register form, including the repeat-password match check used on the
 * client before calling Better Auth.
 */
export const registerFormSchema = signUpSchema
  .extend({
    repeatPassword: z.string(),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Passwords do not match",
    path: ["repeatPassword"],
  });

export type RegisterFormInput = z.infer<typeof registerFormSchema>;

export const signInSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignInInput = z.infer<typeof signInSchema>;
