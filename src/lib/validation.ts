import { z } from "zod";

export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_POST_LENGTH = 5000;
export const MAX_USER_ID_LENGTH = 255;

export type FieldErrors = Record<string, string[]>;

export function getFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    const messages = fieldErrors[field] ?? [];
    messages.push(issue.message);
    fieldErrors[field] = messages;
  }

  return fieldErrors;
}

export function getValidationMessage(error: z.ZodError, fallback: string) {
  return error.issues[0]?.message ?? fallback;
}

export function getResponseFieldErrors(error: unknown): FieldErrors {
  if (!error || typeof error !== "object") return {};

  const candidates = [
    (error as { fieldErrors?: unknown }).fieldErrors,
    (error as { error?: { fieldErrors?: unknown } }).error?.fieldErrors,
    (error as { cause?: { fieldErrors?: unknown } }).cause?.fieldErrors,
  ];

  for (const candidate of candidates) {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      continue;
    }

    const fieldErrors: FieldErrors = {};
    for (const [field, messages] of Object.entries(candidate)) {
      if (!Array.isArray(messages)) continue;
      const validMessages = messages.filter(
        (message): message is string => typeof message === "string",
      );
      if (validMessages.length) fieldErrors[field] = validMessages;
    }
    return fieldErrors;
  }

  return {};
}

const uuidSchema = (message: string) => z.uuid(message);
const cursorTimestampSchema = z.iso.datetime({
  local: true,
  message: "Invalid cursor timestamp.",
});

export const signUpSchema = z.strictObject({
  // Better Auth requires a name field in its client contract. The server ignores
  // this value and derives the stored name from firstName and lastName.
  name: z
    .string()
    .max(MAX_NAME_LENGTH * 2 + 1)
    .optional(),
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
  acceptedTerms: z.literal(true, {
    message: "You must agree to the terms and conditions",
  }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signUpEmailSchema = signUpSchema.extend({
  image: z.string().optional(),
  callbackURL: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

export const registerFormSchema = signUpSchema
  .extend({
    repeatPassword: z
      .string()
      .max(
        MAX_PASSWORD_LENGTH,
        `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
      ),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Passwords do not match",
    path: ["repeatPassword"],
  });

export type RegisterFormInput = z.infer<typeof registerFormSchema>;

export const signInSchema = z.strictObject({
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

export const signInEmailSchema = signInSchema.extend({
  callbackURL: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

export const createPostSchema = z
  .strictObject({
    body: z
      .string({ message: "Post text must be a string." })
      .trim()
      .max(
        MAX_POST_LENGTH,
        `Post must be at most ${MAX_POST_LENGTH.toLocaleString()} characters.`,
      ),
    uploadId: uuidSchema("Invalid image upload.").nullable(),
    isPrivate: z
      .boolean({ message: "Post privacy must be true or false." })
      .default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.body && !data.uploadId) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: "Write something or choose an image.",
      });
    }
  });

export const togglePostLikeSchema = z.strictObject({
  postId: uuidSchema("Invalid post."),
  liked: z.boolean({ message: "Like state must be true or false." }),
});

export const toggleCommentLikeSchema = z.strictObject({
  commentId: uuidSchema("Invalid comment."),
  liked: z.boolean({ message: "Like state must be true or false." }),
});

export const createCommentSchema = z.strictObject({
  postId: uuidSchema("Invalid post."),
  body: z
    .string({ message: "Comment text must be a string." })
    .trim()
    .min(1, "Write a comment before posting.")
    .max(
      MAX_COMMENT_LENGTH,
      `Comment must be at most ${MAX_COMMENT_LENGTH.toLocaleString()} characters.`,
    ),
});

export const createReplySchema = z.strictObject({
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

export const feedCursorSchema = z.strictObject({
  createdAt: cursorTimestampSchema,
  id: uuidSchema("Invalid cursor post."),
});

export const loadMoreCommentsSchema = z.strictObject({
  postId: uuidSchema("Invalid post."),
  cursor: z.strictObject({
    createdAt: cursorTimestampSchema,
    id: uuidSchema("Invalid cursor comment."),
  }),
});

export const loadMoreRepliesSchema = z.strictObject({
  postId: uuidSchema("Invalid post."),
  parentId: uuidSchema("Invalid parent comment."),
  cursor: z.strictObject({
    createdAt: cursorTimestampSchema,
    id: uuidSchema("Invalid cursor reply."),
  }),
});

export const loadLikersSchema = z.strictObject({
  targetType: z.enum(["post", "comment"], {
    message: "Invalid like target.",
  }),
  targetId: uuidSchema("Invalid like target."),
  cursor: z
    .strictObject({
      createdAt: cursorTimestampSchema,
      userId: z
        .string()
        .min(1, "Invalid cursor user.")
        .max(MAX_USER_ID_LENGTH, "Invalid cursor user."),
    })
    .nullable(),
});
