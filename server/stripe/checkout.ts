import Stripe from "stripe";
import { getPricing } from "./products";

let stripe: Stripe | null = null;

/**
 * Get Stripe instance (lazy initialization)
 */
function getStripe(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    stripe = new Stripe(apiKey);
  }
  return stripe;
}

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(options: {
  userId: number;
  userEmail: string;
  userName: string;
  plan: "pro" | "enterprise";
  interval: "month" | "year";
  origin: string;
}) {
  const pricing = getPricing(options.plan, options.interval);

  if (!pricing) {
    throw new Error(`Invalid plan or interval: ${options.plan} ${options.interval}`);
  }

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",
    customer_email: options.userEmail,
    client_reference_id: options.userId.toString(),
    line_items: [
      {
        price: pricing.id,
        quantity: 1,
      },
    ],
    metadata: {
      user_id: options.userId.toString(),
      customer_email: options.userEmail,
      customer_name: options.userName,
      plan: options.plan,
      interval: options.interval,
    },
    success_url: `${options.origin}/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${options.origin}/billing?cancelled=true`,
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Create a Stripe checkout session for one-time payment
 */
export async function createPaymentSession(options: {
  userId: number;
  userEmail: string;
  userName: string;
  amount: number;
  description: string;
  origin: string;
}) {
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: options.userEmail,
    client_reference_id: options.userId.toString(),
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: options.description,
          },
          unit_amount: options.amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: options.userId.toString(),
      customer_email: options.userEmail,
      customer_name: options.userName,
      description: options.description,
    },
    success_url: `${options.origin}/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${options.origin}/billing?cancelled=true`,
  });

  return session;
}

/**
 * Retrieve a checkout session
 */
export async function getCheckoutSession(sessionId: string) {
  return getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "subscription"],
  });
}

/**
 * Get customer subscriptions
 */
export async function getCustomerSubscriptions(customerId: string) {
  return getStripe().subscriptions.list({
    customer: customerId,
    limit: 100,
  });
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  return getStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Update subscription
 */
export async function updateSubscription(subscriptionId: string, options: {
  priceId?: string;
  metadata?: Record<string, string>;
}) {
  const updateData: Stripe.SubscriptionUpdateParams = {};

  if (options.priceId) {
    updateData.items = [
      {
        price: options.priceId,
      },
    ];
  }

  if (options.metadata) {
    updateData.metadata = options.metadata;
  }

  return getStripe().subscriptions.update(subscriptionId, updateData);
}

/**
 * Get invoice
 */
export async function getInvoice(invoiceId: string) {
  return getStripe().invoices.retrieve(invoiceId);
}

/**
 * List customer invoices
 */
export async function getCustomerInvoices(customerId: string) {
  return getStripe().invoices.list({
    customer: customerId,
    limit: 100,
  });
}

/**
 * Get payment intent
 */
export async function getPaymentIntent(paymentIntentId: string) {
  return getStripe().paymentIntents.retrieve(paymentIntentId);
}

/**
 * Create a customer
 */
export async function createCustomer(options: {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}) {
  return getStripe().customers.create({
    email: options.email,
    name: options.name,
    metadata: options.metadata,
  });
}

/**
 * Get or create customer
 */
export async function getOrCreateCustomer(options: {
  email: string;
  name: string;
  userId: number;
}) {
  // Search for existing customer
  const customers = await getStripe().customers.list({
    email: options.email,
    limit: 1,
  });

  if (customers.data.length > 0) {
    return customers.data[0];
  }

  // Create new customer
  return createCustomer({
    email: options.email,
    name: options.name,
    metadata: {
      user_id: options.userId.toString(),
    },
  });
}
