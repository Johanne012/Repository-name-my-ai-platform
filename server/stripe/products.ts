/**
 * Stripe Products & Pricing Configuration
 * Centralized management of all subscription plans and pricing
 */

export const STRIPE_PRODUCTS = {
  FREE: {
    name: "Free Plan",
    description: "مجاني - للبدء",
    features: [
      "5 وكلاء ذكيين",
      "100 تنفيذ شهري",
      "دعم أساسي",
      "API محدودة",
    ],
    limits: {
      agents: 5,
      executionsPerMonth: 100,
      apiCallsPerDay: 100,
    },
  },

  PRO: {
    name: "Pro Plan",
    description: "احترافي - للفرق الصغيرة",
    price: 99,
    currency: "usd",
    interval: "month",
    features: [
      "50 وكيل ذكي",
      "10,000 تنفيذ شهري",
      "دعم أولوي",
      "API متقدمة",
      "تحليلات متقدمة",
      "Multi-Agent Orchestration",
    ],
    limits: {
      agents: 50,
      executionsPerMonth: 10000,
      apiCallsPerDay: 5000,
    },
  },

  ENTERPRISE: {
    name: "Enterprise Plan",
    description: "مؤسسي - للشركات الكبرى",
    price: 999,
    currency: "usd",
    interval: "month",
    features: [
      "وكلاء ذكيين غير محدودة",
      "تنفيذات غير محدودة",
      "دعم 24/7",
      "API متقدمة وغير محدودة",
      "تحليلات متقدمة",
      "Multi-Agent Orchestration متقدمة",
      "SLA مخصص",
      "فريق تطوير مخصص",
      "تدريب وتطوير مخصص",
    ],
    limits: {
      agents: Infinity,
      executionsPerMonth: Infinity,
      apiCallsPerDay: Infinity,
    },
  },
};

export const STRIPE_PRICING = [
  {
    id: "price_free",
    productId: "prod_free",
    planName: "Free",
    amount: 0,
    currency: "usd" as const,
    billingInterval: "month" as const,
    plan: "free" as const,
    description: STRIPE_PRODUCTS.FREE.description,
    features: STRIPE_PRODUCTS.FREE.features,
    limits: STRIPE_PRODUCTS.FREE.limits,
  },
  {
    id: "price_pro_monthly",
    productId: "prod_pro",
    planName: "Pro Monthly",
    amount: STRIPE_PRODUCTS.PRO.price! * 100, // Convert to cents
    currency: "usd" as const,
    billingInterval: "month" as const,
    plan: "pro" as const,
    description: STRIPE_PRODUCTS.PRO.description,
    features: STRIPE_PRODUCTS.PRO.features,
    limits: STRIPE_PRODUCTS.PRO.limits,
  },
  {
    id: "price_pro_yearly",
    productId: "prod_pro",
    planName: "Pro Yearly",
    amount: (STRIPE_PRODUCTS.PRO.price! * 12 * 0.9) * 100, // 10% discount for yearly
    currency: "usd" as const,
    billingInterval: "year" as const,
    plan: "pro" as const,
    description: STRIPE_PRODUCTS.PRO.description,
    features: STRIPE_PRODUCTS.PRO.features,
    limits: STRIPE_PRODUCTS.PRO.limits,
  },
  {
    id: "price_enterprise_monthly",
    productId: "prod_enterprise",
    planName: "Enterprise Monthly",
    amount: STRIPE_PRODUCTS.ENTERPRISE.price! * 100,
    currency: "usd" as const,
    billingInterval: "month" as const,
    plan: "enterprise" as const,
    description: STRIPE_PRODUCTS.ENTERPRISE.description,
    features: STRIPE_PRODUCTS.ENTERPRISE.features,
    limits: STRIPE_PRODUCTS.ENTERPRISE.limits,
  },
  {
    id: "price_enterprise_yearly",
    productId: "prod_enterprise",
    planName: "Enterprise Yearly",
    amount: (STRIPE_PRODUCTS.ENTERPRISE.price! * 12 * 0.85) * 100, // 15% discount for yearly
    currency: "usd" as const,
    billingInterval: "year" as const,
    plan: "enterprise" as const,
    description: STRIPE_PRODUCTS.ENTERPRISE.description,
    features: STRIPE_PRODUCTS.ENTERPRISE.features,
    limits: STRIPE_PRODUCTS.ENTERPRISE.limits,
  },
];

/**
 * Get pricing for a specific plan
 */
export function getPricing(plan: "free" | "pro" | "enterprise", interval: "month" | "year" = "month") {
  if (plan === "free") {
    return STRIPE_PRICING.find((p) => p.plan === "free");
  }
  return STRIPE_PRICING.find((p) => p.plan === plan && p.billingInterval === interval);
}

/**
 * Get all pricing options
 */
export function getAllPricing() {
  return STRIPE_PRICING;
}

/**
 * Get plan limits
 */
export function getPlanLimits(plan: "free" | "pro" | "enterprise") {
  return STRIPE_PRODUCTS[plan.toUpperCase() as keyof typeof STRIPE_PRODUCTS]?.limits || STRIPE_PRODUCTS.FREE.limits;
}

/**
 * Check if user has exceeded limits
 */
export function checkLimits(plan: "free" | "pro" | "enterprise", usage: {
  agents: number;
  executionsThisMonth: number;
  apiCallsToday: number;
}) {
  const limits = getPlanLimits(plan);

  return {
    agentsExceeded: usage.agents > limits.agents,
    executionsExceeded: usage.executionsThisMonth > limits.executionsPerMonth,
    apiCallsExceeded: usage.apiCallsToday > limits.apiCallsPerDay,
  };
}
