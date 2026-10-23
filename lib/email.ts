import "server-only";

type EmailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(options: EmailOptions): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM } = process.env;

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    throw new Error("Email configuration is missing.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html,
    }),
    signal: AbortSignal.timeout(10000),
  });
  
  export async function sendEmail(options: EmailOptions): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM } = process.env;

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    throw new Error("Email configuration is missing.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");

    console.error("Resend rejected the email:", response.status, details);

    throw new Error("The email could not be sent.");
  }
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function singleLine(value: string | null | undefined): string {
  return (value ?? "").replace(/[\r\n]+/g, " ").trim();
}

export async function sendCaretakerInvitationEmail(
  email: string,
  invitationUrl: string,
  details: { ownerName?: string | null; location?: string | null } = {},
): Promise<void> {
  const url = new URL(invitationUrl);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    (url.protocol === "http:" &&
      !["localhost", "127.0.0.1"].includes(url.hostname))
  ) {
    throw new Error("Invalid invitation URL.");
  }

  const ownerName = singleLine(details.ownerName);
  const location = singleLine(details.location);

  const subject = ownerName
    ? `${ownerName} invited you to look after a property on Baytak Care`
    : "You're invited to Baytak Care";

  const whoText = ownerName || "A property owner";
  const whereText = location ? ` in ${location}` : "";

  const text = [
    `${whoText} invited you to look after their property${whereText} on Baytak Care.`,
    "",
    "To accept the invitation:",
    "1. Open this link:",
    url.href,
    `2. Create an account or log in using this email address: ${email}`,
    "3. Accept the invitation.",
    "",
    "This invitation expires in 7 days.",
    "If you weren't expecting it, you can ignore this email. Nothing happens unless you accept.",
  ].join("\n");

  const safeUrl = escapeHtmlText(url.href);
  const safeEmail = escapeHtmlText(email);
  const who = ownerName
    ? `<strong>${escapeHtmlText(ownerName)}</strong>`
    : "A property owner";
  const where = location
    ? ` in <strong>${escapeHtmlText(location)}</strong>`
    : "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F7F6F3;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Open the invitation, create an account and accept it. It expires in 7 days.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F3;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E4E1D9;border-radius:16px;">
            <tr>
              <td style="padding:28px 32px 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#14213D;">
                Baytak Care
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;font-family:Arial,Helvetica,sans-serif;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#181A1B;">You've been invited</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3D3F3C;">
                  ${who} invited you to look after their property${where} as a caretaker on Baytak Care.
                </p>
                <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;border-radius:10px;background:#1F4E79;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;">
                  View invitation
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0;font-family:Arial,Helvetica,sans-serif;">
                <div style="padding:16px 18px;border-radius:12px;background:#F7F6F3;font-size:14px;line-height:1.7;color:#3D3F3C;">
                  <strong style="color:#181A1B;">What happens next</strong><br />
                  1. Open the invitation.<br />
                  2. Create an account or log in with this email address: <strong>${safeEmail}</strong><br />
                  3. Accept the invitation.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#8B8D89;">
                This invitation expires in 7 days.<br />
                If the button doesn't work, copy this link into your browser:<br />
                <a href="${safeUrl}" style="color:#1F4E79;word-break:break-all;">${safeUrl}</a><br /><br />
                If you weren't expecting this, you can ignore this email. Nothing happens unless you accept.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}