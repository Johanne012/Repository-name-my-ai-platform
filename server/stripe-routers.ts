import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as checkout from "./stripe/checkout";
import { getAllPricing, getPricing, getPlanLimits } from "./stripe/products";

export const stripeRouter = router({
  // Get all pricing plans
  getPricing: protectedProcedure.query(async () => {
    return getAllPricing();
  }),

  // Get specific pricing
  getPricingForPlan: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["free", "pro", "enterprise"]),
        interval: z.enum(["month", "year"]).optional().default("month"),
      })
    )
    .query(async ({ input }) => {
      if (input.plan === "free") {
        return getPricing("free");
      }
      return getPricing(input.plan, input.interval);
    }),

  // Get plan limits
  getPlanLimits: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["free", "pro", "enterprise"]),
      })
    )
    .query(async ({ input }) => {
      return getPlanLimits(input.plan);
    }),

  // Create checkout session
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["pro", "enterprise"]),
        interval: z.enum(["month", "year"]).optional().default("month"),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await checkout.createCheckoutSession({
        userId: ctx.user.id,
        userEmail: ctx.user.email || "",
        userName: ctx.user.name || "User",
        plan: input.plan,
        interval: input.interval,
        origin: input.origin,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    }),

  // Get checkout session
  getCheckoutSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const session = await checkout.getCheckoutSession(input.sessionId);
      return {
        id: session.id,
        status: session.payment_status,
        subscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
        paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      };
    }),

  // Get customer subscriptions
  getSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    // In a real implementation, you would fetch the Stripe customer ID from the database
    // and then get their subscriptions
    // For now, return empty array
    return [];
  }),

  // Cancel subscription
  cancelSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const subscription = await checkout.cancelSubscription(input.subscriptionId);
      return {
        id: subscription.id,
        status: subscription.status,
      };
    }),

  // Update subscription
  updateSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        priceId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const subscription = await checkout.updateSubscription(input.subscriptionId, {
        priceId: input.priceId,
      });
      return {
        id: subscription.id,
        status: subscription.status,
      };
    }),

  // Get invoices
  getInvoices: protectedProcedure.query(async ({ ctx }) => {
    // In a real implementation, you would fetch the Stripe customer ID from the database
    // and then get their invoices
    // For now, return empty array
    return [];
  }),

  // Get invoice
  getInvoice: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const invoice = await checkout.getInvoice(input.invoiceId);
      return {
        id: invoice.id,
        amount: invoice.amount_paid,
        status: invoice.status,
        pdfUrl: invoice.hosted_invoice_url,
      };
    }),
});
