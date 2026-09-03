import { describe, expect, it } from "vitest";
import { rankBuyerProducts } from "@/lib/commerce/ranking";
import type { CatalogProduct } from "@/lib/commerce/catalog";

const product: CatalogProduct = {
  id: "p1",
  sku: "RUN",
  name: "Comfort Durable Runner",
  brand: "Stride",
  category: "running_shoes",
  description: "Daily running",
  price: 3799,
  cost: 2700,
  margin: 1099,
  rating: 4.6,
  features: ["comfort", "durability"],
  returnRisk: "low",
  relevantAccessories: [],
  inventory: 10,
};

describe("ranking", () => {
  it("returns weighted explainable score", () => {
    const result = rankBuyerProducts(
      [product],
      {
        category: "running_shoes",
        budget_max: 4000,
        use_case: "daily running",
        priorities: ["comfort", "durability"],
        product_requirements: [],
        battery_hours_min: null,
        preferred_brands: null,
        excluded_brands: null,
        urgency: null,
        price_sensitivity: null,
      },
    );

    expect(result[0].score).toBeGreaterThan(80);
    expect(result[0].factors.rating).toBe(92);
  });
});