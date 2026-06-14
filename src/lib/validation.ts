import { z } from "zod";

export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_COMMENT_LENGTH = 2000;

export const signUpSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(
      MAX_NAME_LENGTH,
      `First name must be at most ${MAX_NAME_LENGTH} characters`,
    ),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(
      MAX_NAME_LENGTH,
      `Last name must be at most ${MAX_NAME_LENGTH} characters`,
    ),
  email: z
    .email("Please enter a valid email address")
    .max(
      MAX_EMAIL_LENGTH,
      `Email must be at most ${MAX_EMAIL_LENGTH} characters`,
    ),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    )
    .max(
      MAX_PASSWORD_LENGTH,
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
    ),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

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
  email: z
    .email("Please enter a valid email address")
    .max(
      MAX_EMAIL_LENGTH,
      `Email must be at most ${MAX_EMAIL_LENGTH} characters`,
    ),
  password: z
    .string()
    .min(1, "Password is required")
    .max(
      MAX_PASSWORD_LENGTH,
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
    ),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const createReplySchema = z.object({
  postId: z.uuid("Invalid post."),
  parentId: z.uuid("Invalid parent comment."),
  body: z
    .string()
    .trim()
    .min(1, "Write a reply before posting.")
    .max(
      MAX_COMMENT_LENGTH,
      `Reply must be at most ${MAX_COMMENT_LENGTH.toLocaleString()} characters.`,
    ),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
