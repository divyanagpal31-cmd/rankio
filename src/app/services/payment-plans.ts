export type PayPalCheckoutPlanId = "starter" | "growth";
export type SalesPlanId = "pro";
export type PaymentPlanId = PayPalCheckoutPlanId | SalesPlanId;

export type PaymentPlan = {
  id: PaymentPlanId;
  name: string;
  description: string;
  priceLabel: string;
  amount: string;
  reportQuota: number | null;
  features: string[];
  cta: string;
  popular?: boolean;
  checkoutEnabled: boolean;
};

export const paymentPlans: PaymentPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for testing your website's AI readiness.",
    priceLabel: "$9.99",
    amount: "9.99",
    reportQuota: 1,
    features: ["1 AI readiness report", "Full insights", "Actionable recommendations", "PDF download"],
    cta: "Unlock Full Report",
    checkoutEnabled: true,
  },
  {
    id: "growth",
    name: "Growth",
    description: "Best value for growing businesses.",
    priceLabel: "$34.99",
    amount: "34.99",
    reportQuota: 5,
    features: ["5 reports", "Priority processing", "PDF + CSV exports", "Advanced insights"],
    cta: "Get 5 Reports",
    popular: true,
    checkoutEnabled: true,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For agencies and power users.",
    priceLabel: "$59.99",
    amount: "59.99",
    reportQuota: 10,
    features: ["10 reports", "Advanced insights", "All export formats", "Future credits", "Priority support"],
    cta: "Get in Touch",
    checkoutEnabled: false,
  },
];

export function getPaymentPlan(planId: PaymentPlanId): PaymentPlan {
  const plan = paymentPlans.find((item) => item.id === planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  return plan;
}

export function isPayPalCheckoutPlan(planId: PaymentPlanId): planId is PayPalCheckoutPlanId {
  return planId === "starter" || planId === "growth";
}

