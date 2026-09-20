import { Resend } from "resend";

async function sendAuthEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Set RESEND_API_KEY and RESEND_FROM_EMAIL to send authentication emails.");
  }

  const { error } = await new Resend(apiKey).emails.send({
    from,
    to,
    subject,
    text,
  });

  if (error) {
    // Do not expose provider details or verification tokens in auth responses.
    throw new Error("Unable to send the email. Please try again later.");
  }
}

type AuthEmail = { user: { email: string }; url: string };

export async function sendVerificationEmail({ user, url }: AuthEmail) {
  await sendAuthEmail(user.email, "Verify your NotifyMind email",
    `Verify your email address to sign in to NotifyMind:\n\n${url}\n\nThis link expires in 1 hour. If you didn't create an account, you can ignore this email.`);
}

export async function sendResetPassword({ user, url }: AuthEmail) {
  await sendAuthEmail(user.email, "Reset your NotifyMind password",
    `Reset your NotifyMind password:\n\n${url}\n\nThis link expires in 1 hour and can only be used once. If you didn't request a password reset, you can ignore this email.`);
}
