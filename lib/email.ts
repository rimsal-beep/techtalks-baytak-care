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
  invitationUrl: string,
): Promise<void> {
  const subject = "You're invited to Baytak Care";

  const url = new URL(invitationUrl);

  if (
    !["https:", "http:"].includes(url.protocol) ||
    (url.protocol === "http:" &&
      !["localhost", "127.0.0.1"].includes(url.hostname))
  ) {
    throw new Error("Invalid invitation URL.");
  }

  const safeUrl = url.href.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

  const text = [
    "You've been invited to join Baytak Care as a caretaker.",
    "",
    "Open the following link to accept your invitation:",
    invitationUrl,
    "",
    "This invitation expires in 7 days.",
    "If you weren't expecting this invitation, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
      <h2>You're invited to Baytak Care!</h2>

      <p>You've been invited to join Baytak Care as a caretaker.</p>

      <p>Click the button below to view and accept your invitation:</p>

      <p style="margin:30px 0;">
        <a
          href="${safeUrl}"
          style="background-color:#2563eb;color:#ffffff;padding:12px 24px;
                 text-decoration:none;border-radius:6px;display:inline-block;"
        >
          View Invitation
        </a>
      </p>

      <p>If the button doesn't work, copy this link:</p>
      <p><a href="${safeUrl}">${safeUrl}</a></p>

      <p>This invitation expires in 7 days.</p>
      <p>If you weren't expecting this invitation, you can ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}