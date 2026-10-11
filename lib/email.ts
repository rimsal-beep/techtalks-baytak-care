import "server-only";
import nodemailer from "nodemailer";

type EmailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(options: EmailOptions): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM } =
    process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !EMAIL_FROM) {
    throw new Error("SMTP configuration is missing.");
  }

  const port = Number(SMTP_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid SMTP port.");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}


export async function sendCaretakerInvitationEmail(
  email: string,
  invitationUrl: string
): Promise<void> {
  const subject = "You're invited to Baytak Care";

  const text = [
    "You've been invited to join Baytak Care as a caretaker.",
    "",
    "Open the following link to accept your invitation:",
    invitationUrl,
    "",
    "This invitation expires in 7 days.",
    "If you weren't expecting this invitation, you can ignore this email.",
  ].join("\n");

  await sendEmail({
    to: email,
    subject,
    text,
  });
}
