export async function sendEmail({
  to,
  subject,
  htmlContent,
  replyTo,
}: {
  to: string;
  subject: string;
  htmlContent: string;
  replyTo?: { email: string; name?: string };
}) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    throw new Error("BREVO_API_KEY is not defined in environment variables");
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@mvcorner.com";
  const senderName = process.env.BREVO_SENDER_NAME || "MVCorner";

  const body: Record<string, unknown> = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [
      {
        email: to,
      },
    ],
    subject: subject,
    htmlContent: htmlContent,
  };

  if (replyTo) {
    body.replyTo = replyTo;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": brevoApiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Brevo API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
    );
  }

  return await response.json();
}
