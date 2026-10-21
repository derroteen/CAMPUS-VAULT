// Shared HTML wrapper for transactional emails sent via lib/email.ts (Brevo),
// so subscription and approval emails look like they belong to the same app.

const BRAND_BLUE = "#2556E8";
const BRAND_VIOLET = "#7C3AED";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmailCard({
  heading,
  bodyHtml,
  ctaLabel,
  ctaUrl,
}: {
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const cta =
    ctaLabel && ctaUrl
      ? `<div style="margin-top: 24px;">
          <a href="${ctaUrl}" style="display: inline-block; background-color: ${BRAND_BLUE}; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 10px; font-weight: 600; font-size: 14px;">${ctaLabel}</a>
        </div>`
      : "";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1a202c;">
      <p style="margin: 0 0 20px; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND_VIOLET};">MVCorner</p>
      <h2 style="color: #0a1128; margin: 0 0 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; font-size: 20px;">${heading}</h2>
      <div style="font-size: 15px; line-height: 1.6; color: #4a5568;">${bodyHtml}</div>
      ${cta}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 16px;" />
      <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">This is an automated message from MVCorner.</p>
    </div>
  `;
}