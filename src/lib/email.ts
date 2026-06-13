// TODO: Replace this stub with a real email provider (Resend, SES, Nodemailer,
// etc.). Until then, outgoing emails are logged to the server console so the
// auth flows (verification, password reset) can be exercised in development.

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({
  to,
  subject,
  text,
}: SendEmailParams): Promise<void> {
  console.log(`[email:stub] to=${to} subject="${subject}"\n${text}`);
}
