import { Resend } from "resend";

export async function sendVerificationEmail({
  user,
  url,
}: {
  user: { email: string };
  url: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Set RESEND_API_KEY and RESEND_FROM_EMAIL to send verification emails.");
  }

  const { error } = await new Resend(apiKey).emails.send({
    from,
    to: user.email,
    subject: "Verify your NotifyMind email",
    text: `Verify your email address to sign in to NotifyMind:\n\n${url}\n\nThis link expires in 1 hour. If you didn't create an account, you can ignore this email.`,
  });

  if (error) {
    // Do not expose provider details or verification tokens in auth responses.
    throw new Error("Unable to send the verification email. Please try again later.");
  }
}
