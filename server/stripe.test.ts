import { describe, it, expect, beforeEach } from "vitest";
import { getPricing, getPlanLimits, checkLimits, getAllPricing } from "./stripe/products";

describe("Stripe Products & Pricing", () => {
  describe("getPricing", () => {
    it("should return free plan pricing", () => {
      const pricing = getPricing("free");
      expect(pricing).toBeDefined();
      expect(pricing?.plan).toBe("free");
      expect(pricing?.amount).toBe(0);
    });

    it("should return pro monthly pricing", () => {
      const pricing = getPricing("pro", "month");
      expect(pricing).toBeDefined();
      expect(pricing?.plan).toBe("pro");
      expect(pricing?.amount).toBeGreaterThan(0);
      expect(pricing?.billingInterval).toBe("month");
    });

    it("should return pro yearly pricing with discount", () => {
      const monthlyPricing = getPricing("pro", "month");
      const yearlyPricing = getPricing("pro", "year");

      expect(monthlyPricing).toBeDefined();
      expect(yearlyPricing).toBeDefined();

      // Yearly should be cheaper per month (10% discount)
      const monthlyPerMonth = monthlyPricing!.amount;
      const yearlyPerMonth = yearlyPricing!.amount / 12;

      expect(yearlyPerMonth).toBeLessThan(monthlyPerMonth);
    });

    it("should return enterprise pricing", () => {
      const pricing = getPricing("enterprise", "month");
      expect(pricing).toBeDefined();
      expect(pricing?.plan).toBe("enterprise");
      expect(pricing?.amount).toBeGreaterThan(0);
    });
  });

  describe("getAllPricing", () => {
    it("should return all pricing options", () => {
      const allPricing = getAllPricing();
      expect(allPricing.length).toBeGreaterThan(0);
      expect(allPricing.some((p) => p.plan === "free")).toBe(true);
      expect(allPricing.some((p) => p.plan === "pro")).toBe(true);
      expect(allPricing.some((p) => p.plan === "enterprise")).toBe(true);
    });
  });

  describe("getPlanLimits", () => {
    it("should return free plan limits", () => {
      const limits = getPlanLimits("free");
      expect(limits.agents).toBe(5);
      expect(limits.executionsPerMonth).toBe(100);
      expect(limits.apiCallsPerDay).toBe(100);
    });

    it("should return pro plan limits", () => {
      const limits = getPlanLimits("pro");
      expect(limits.agents).toBe(50);
      expect(limits.executionsPerMonth).toBe(10000);
      expect(limits.apiCallsPerDay).toBe(5000);
    });

    it("should return enterprise plan limits (unlimited)", () => {
      const limits = getPlanLimits("enterprise");
      expect(limits.agents).toBe(Infinity);
      expect(limits.executionsPerMonth).toBe(Infinity);
      expect(limits.apiCallsPerDay).toBe(Infinity);
    });
  });

  describe("checkLimits", () => {
    it("should detect when free plan limits are exceeded", () => {
      const result = checkLimits("free", {
        agents: 10,
        executionsThisMonth: 150,
        apiCallsToday: 150,
      });

      expect(result.agentsExceeded).toBe(true);
      expect(result.executionsExceeded).toBe(true);
      expect(result.apiCallsExceeded).toBe(true);
    });

    it("should allow usage within limits", () => {
      const result = checkLimits("free", {
        agents: 3,
        executionsThisMonth: 50,
        apiCallsToday: 50,
      });

      expect(result.agentsExceeded).toBe(false);
      expect(result.executionsExceeded).toBe(false);
      expect(result.apiCallsExceeded).toBe(false);
    });

    it("should allow unlimited usage for enterprise", () => {
      const result = checkLimits("enterprise", {
        agents: 10000,
        executionsThisMonth: 1000000,
        apiCallsToday: 100000,
      });

      expect(result.agentsExceeded).toBe(false);
      expect(result.executionsExceeded).toBe(false);
      expect(result.apiCallsExceeded).toBe(false);
    });
  });

  describe("Pricing consistency", () => {
    it("should have consistent plan features", () => {
      const allPricing = getAllPricing();

      allPricing.forEach((pricing) => {
        expect(pricing.features).toBeDefined();
        expect(Array.isArray(pricing.features)).toBe(true);
        expect(pricing.limits).toBeDefined();
      });
    });

    it("should have incrementing prices for higher plans", () => {
      const free = getPricing("free");
      const pro = getPricing("pro", "month");
      const enterprise = getPricing("enterprise", "month");

      expect(free!.amount).toBeLessThan(pro!.amount);
      expect(pro!.amount).toBeLessThan(enterprise!.amount);
    });
  });
});
