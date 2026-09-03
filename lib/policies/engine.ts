export const POLICY = {
  maxDiscountPercent: 10,
  maxAutomaticUpsell: 500,
  maxAutomaticRetry: 1,
  approvalThreshold: 10000,
} as const;

export function evaluateFinancialAction(x: {
  amount: number;
  discountPercent?: number;
  upsellAmount?: number;
  retryCount?: number;
  confirmed: boolean;
}) {
  const checks = {
    inventory: true,
    amount: x.amount > 0,
    discount: (x.discountPercent ?? 0) <= POLICY.maxDiscountPercent,
    upsell: (x.upsellAmount ?? 0) <= POLICY.maxAutomaticUpsell,
    retry_limit: (x.retryCount ?? 0) < POLICY.maxAutomaticRetry,
    customer_confirmation: x.confirmed,
  };

  const reasons: string[] = [];

  if (!checks.amount) reasons.push("Amount must be positive");
  if (!checks.discount) reasons.push("Discount exceeds policy limit");
  if (!checks.upsell) reasons.push("Automatic upsell exceeds policy limit");
  if (!checks.retry_limit) reasons.push("Retry limit reached");
  if (!checks.customer_confirmation) {
    reasons.push("Customer confirmation required");
  }
  if (x.amount > POLICY.approvalThreshold) {
    reasons.push("Transaction exceeds automatic approval threshold");
  }

  return {
    allowed:
      Object.values(checks).every(Boolean) &&
      x.amount <= POLICY.approvalThreshold,
    reasons,
    checks,
    approvalRequired: x.amount > POLICY.approvalThreshold,
  };
}

export async function loadPolicy(merchantId: string) {
  const { prisma } = await import("@/lib/db/client");
  return prisma.policy.findFirst({
    where: { name: "default", merchantId },
  });
}
