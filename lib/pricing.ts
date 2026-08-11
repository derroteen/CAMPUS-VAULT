export type ProPlanId = "week" | "two_week" | "month";

type PlanPrice = {
  amountKes: number;
  regularAmountKes: number;
  isLaunchOffer: boolean;
};

const LAUNCH_WINDOW_START = new Date("2026-09-05T00:00:00+03:00");
const LAUNCH_WINDOW_END = new Date("2026-11-05T00:00:00+03:00");

const OFFER_PRICES: Record<ProPlanId, number> = {
  week: 40,
  two_week: 70,
  month: 130,
};

const REGULAR_PRICES: Record<ProPlanId, number> = {
  week: 60,
  two_week: 110,
  month: 200,
};

export function getPlanPrice(planId: ProPlanId, now = new Date()): PlanPrice {
  const inLaunchWindow = now >= LAUNCH_WINDOW_START && now < LAUNCH_WINDOW_END;
  const useRegularPricing = now >= LAUNCH_WINDOW_END;

  if (useRegularPricing) {
    return {
      amountKes: REGULAR_PRICES[planId],
      regularAmountKes: REGULAR_PRICES[planId],
      isLaunchOffer: false,
    };
  }

  return {
    amountKes: OFFER_PRICES[planId],
    regularAmountKes: REGULAR_PRICES[planId],
    isLaunchOffer: inLaunchWindow,
  };
}