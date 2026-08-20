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
    name: "AI Visibility Report",
    description: "Perfect for businesses analyzing a single website.",
    priceLabel: "$9.99",
    amount: "9.99",
    reportQuota: 1,
    features: ["1 AI Visibility Report", "AI Visibility Score", "Industry-Specific Analysis", "Accessibility Review", "Structured Data Analysis", "Content & Brand Evaluation", " Priority Action Plan", "Downloadable PDF Report"],
    cta: "Generate My Report",
    checkoutEnabled: true,
  },
  {
    id: "growth",
    name: "Team Pack",
    description: "Perfect for consultants, freelancers, and businesses managing multiple websites.",
    priceLabel: "$34.99",
    amount: "34.99",
    reportQuota: 5,
    features: ["5 AI Visibility Reports", "Priority Processing", "PDF & CSV Export", "Email Support", "Team Dashboard (Coming Soon)"],
    cta: "Get 5 Reports",
    popular: true,
    checkoutEnabled: true,
  },
  {
    id: "pro",
    name: "Agency Plan",
    description: "Unlimited reports, team access, API (future), white-label reports (future).",
    priceLabel: "$59.99",
    amount: "59.99",
    reportQuota: 10,
    features: ["10 reports", "White-Label Reports (Coming Soon)", "Team Collaboration (Coming Soon)", "API Access (Coming Soon)", "Priority Support"],
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

