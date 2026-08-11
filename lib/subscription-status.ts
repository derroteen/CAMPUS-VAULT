type SubscriptionLike = {
  status: string;
  expires_at: string;
};

export function isSubscriptionCurrentlyActive(
  subscription: SubscriptionLike | null | undefined
): boolean {
  if (!subscription) {
    return false;
  }

  if (subscription.status !== "active") {
    return false;
  }

  const expiresAt = new Date(subscription.expires_at);
  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return expiresAt > new Date();
}