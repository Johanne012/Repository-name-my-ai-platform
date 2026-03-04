import Stripe from "stripe";
import { Request, Response } from "express";
import * as db from "../db";

let stripe: Stripe | null = null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Get Stripe instance
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
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error(`Webhook processing error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = parseInt(session.client_reference_id || "0");
  const metadata = session.metadata || {};

  console.log(`[Webhook] Checkout session completed for user ${userId}`);

  if (!userId) {
    console.error("No user ID found in checkout session");
    return;
  }

  // For subscription mode
  if (session.mode === "subscription" && session.subscription) {
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;

    // Update user subscription in database
    // This will be called again by customer.subscription.created event
    console.log(`[Webhook] Subscription ID: ${subscriptionId}`);
  }

  // For payment mode
  if (session.mode === "payment" && session.payment_intent) {
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
    console.log(`[Webhook] Payment Intent ID: ${paymentIntentId}`);
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = parseInt(subscription.metadata?.user_id || "0");
  const plan = (subscription.metadata?.plan || "pro") as "pro" | "enterprise";

  console.log(`[Webhook] Subscription created for user ${userId}, plan: ${plan}`);

  if (!userId) {
    console.error("No user ID found in subscription metadata");
    return;
  }

  // Update user subscription in database
  // Note: In a real implementation, you would update the subscriptions table
  // await db.updateUserSubscription(userId, {
  //   stripeSubscriptionId: subscription.id,
  //   plan,
  //   status: 'active',
  //   currentPeriodStart: new Date(subscription.current_period_start * 1000),
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  // });
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = parseInt(subscription.metadata?.user_id || "0");

  console.log(`[Webhook] Subscription updated for user ${userId}`);

  if (!userId) {
    console.error("No user ID found in subscription metadata");
    return;
  }

  // Update subscription status in database
  // await db.updateUserSubscription(userId, {
  //   status: subscription.status as 'active' | 'canceled' | 'past_due',
  //   currentPeriodStart: new Date(subscription.current_period_start * 1000),
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  // });
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = parseInt(subscription.metadata?.user_id || "0");

  console.log(`[Webhook] Subscription deleted for user ${userId}`);

  if (!userId) {
    console.error("No user ID found in subscription metadata");
    return;
  }

  // Update subscription status to canceled
  // await db.updateUserSubscription(userId, {
  //   status: 'canceled',
  // });
}

/**
 * Handle invoice.paid event
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const userId = parseInt(invoice.metadata?.user_id || "0");

  console.log(`[Webhook] Invoice paid for user ${userId}`);

  if (!userId) {
    console.error("No user ID found in invoice metadata");
    return;
  }

  // Log payment in database
  // await db.logPayment(userId, {
  //   stripeInvoiceId: invoice.id,
  //   amount: invoice.amount_paid,
  //   status: 'paid',
  // });
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const userId = parseInt(invoice.metadata?.user_id || "0");

  console.log(`[Webhook] Invoice payment failed for user ${userId}`);

  if (!userId) {
    console.error("No user ID found in invoice metadata");
    return;
  }

  // Log failed payment
  // await db.logPayment(userId, {
  //   stripeInvoiceId: invoice.id,
  //   amount: invoice.amount_due,
  //   status: 'failed',
  // });
}

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const userId = parseInt(paymentIntent.metadata?.user_id || "0");

  console.log(`[Webhook] Payment intent succeeded for user ${userId}`);

  if (!userId) {
    console.error("No user ID found in payment intent metadata");
    return;
  }

  // Log successful payment
  // await db.logPayment(userId, {
  //   stripePaymentIntentId: paymentIntent.id,
  //   amount: paymentIntent.amount,
  //   status: 'succeeded',
  // });
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const userId = parseInt(paymentIntent.metadata?.user_id || "0");

  console.log(`[Webhook] Payment intent failed for user ${userId}`);

  if (!userId) {
    console.error("No user ID found in payment intent metadata");
    return;
  }

  // Log failed payment
  // await db.logPayment(userId, {
  //   stripePaymentIntentId: paymentIntent.id,
  //   amount: paymentIntent.amount,
  //   status: 'failed',
  // });
}
