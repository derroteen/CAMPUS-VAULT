import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "@/lib/site-config";

function getSecret() {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error("UNSUBSCRIBE_SECRET must be set to create or verify unsubscribe links.");
  }
  return secret;
}

function signUserId(userId: string, secret = getSecret()) {
  return createHmac("sha256", secret).update(userId).digest("hex");
}

export function createUnsubscribeToken(userId: string) {
  return `${userId}.${signUserId(userId)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const secret = getSecret();
  const separator = token.lastIndexOf(".");
  if (separator <= 0) {
    return null;
  }

  const userId = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  if (!/^[a-f0-9]{64}$/i.test(providedSignature)) {
    return null;
  }

  const expectedSignature = signUserId(userId, secret);
  const providedBuffer = Buffer.from(providedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  return timingSafeEqual(providedBuffer, expectedBuffer) ? userId : null;
}

export function buildUnsubscribeUrl(userId: string) {
  const token = createUnsubscribeToken(userId);
  return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}
