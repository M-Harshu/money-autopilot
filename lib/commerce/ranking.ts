import type { BuyerIntent } from "@/lib/agents/buyer-intent";
import type { CatalogProduct } from "@/lib/commerce/catalog";

export type BuyerRanking = {
  product_id: string;
  sku: string;
  score: number;
  factors: {
    budget_fit: number;
    requirement_match: number;
    rating: number;
    feature_use_case_match: number;
    return_risk: number;
    margin: number;
    inventory: number;
  };
};

const norm = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function cleanValues(
  values: string[] | null | undefined,
): string[] {
  return (values ?? []).filter(
    (value): value is string =>
      typeof value === "string" &&
      value.trim().length > 0,
  );
}

function budgetScore(
  product: CatalogProduct,
  intent: BuyerIntent,
): number {
  if (
    intent.budget_max === null ||
    intent.budget_max === undefined
  ) {
    return 100;
  }

  if (
    product.price >
    intent.budget_max
  ) {
    return 0;
  }

  const ratio =
    product.price /
    intent.budget_max;

  return Math.round(
    70 + (1 - ratio) * 30,
  );
}

function requirementScore(
  product: CatalogProduct,
  intent: BuyerIntent,
): number {
  const text = norm(
    [
      product.name,
      product.description,
      product.features.join(" "),
      product.category,
      product.brand,
    ].join(" "),
  );

  const requirements = [
    ...cleanValues(
      intent.product_requirements,
    ),
    ...cleanValues(
      intent.priorities,
    ),
  ];

  if (!requirements.length) {
    return 75;
  }

  let matched = 0;

  for (const requirement of requirements) {
    if (
      text.includes(norm(requirement))
    ) {
      matched++;
    }
  }

  return Math.round(
    (matched /
      requirements.length) *
      100,
  );
}

function featureUseCaseScore(
  product: CatalogProduct,
  intent: BuyerIntent,
): number {
  const text = norm(
    [
      product.name,
      product.description,
      product.features.join(" "),
      product.category,
    ].join(" "),
  );

  const priorities =
    cleanValues(
      intent.priorities,
    );

  const useCaseTerms =
    intent.use_case
      ? cleanValues(
          intent.use_case.split(
            /\s+/,
          ),
        )
      : [];

  const signals = [
    ...priorities,
    ...useCaseTerms,
  ];

  if (!signals.length) {
    return 75;
  }

  let matched = 0;

  for (const signal of signals) {
    if (
      text.includes(norm(signal))
    ) {
      matched++;
    }
  }

  return Math.round(
    (matched /
      signals.length) *
      100,
  );
}

function ratingScore(
  product: CatalogProduct,
): number {
  const rating = Math.max(
    0,
    Math.min(
      5,
      product.rating,
    ),
  );

  return Math.round(
    (rating / 5) * 100,
  );
}

function returnRiskScore(
  product: CatalogProduct,
): number {
  switch (
    product.returnRisk
      .toLowerCase()
      .trim()
  ) {
    case "low":
      return 100;

    case "medium":
      return 60;

    case "high":
      return 20;

    default:
      return 50;
  }
}

/**
 * Merchant margin score.
 *
 * Margin percentage is measured against
 * selling price, not cost.
 *
 * Example:
 *
 * price = ₹5,000
 * margin = ₹1,000
 *
 * margin percentage = 20%
 */
function marginScore(
  product: CatalogProduct,
): number {
  if (
    product.price <= 0 ||
    product.margin <= 0
  ) {
    return 0;
  }

  const marginPercentage =
    (product.margin /
      product.price) *
    100;

  /*
   * 40%+ margin receives maximum score.
   *
   * We intentionally do not reward margin
   * without limit because merchant economics
   * must remain subordinate to buyer utility.
   */
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (marginPercentage /
          40) *
          100,
      ),
    ),
  );
}

/**
 * Inventory health score.
 *
 * We don't want to recommend products that
 * are technically available but nearly sold out
 * when a healthier inventory option exists.
 */
function inventoryScore(
  product: CatalogProduct,
): number {
  if (product.inventory <= 0) {
    return 0;
  }

  if (product.inventory >= 20) {
    return 100;
  }

  if (product.inventory >= 10) {
    return 90;
  }

  if (product.inventory >= 5) {
    return 75;
  }

  if (product.inventory >= 2) {
    return 60;
  }

  return 45;
}

export function rankBuyerProducts(
  products: CatalogProduct[],
  intent: BuyerIntent,
): BuyerRanking[] {
  return products
    .filter((product) => {
      /*
       * Hard budget constraint.
       */
      if (
        intent.budget_max !== null &&
        intent.budget_max !== undefined &&
        product.price >
          intent.budget_max
      ) {
        return false;
      }

      /*
       * Hard inventory constraint.
       */
      if (
        product.inventory <= 0
      ) {
        return false;
      }

      /*
       * Excluded brands are hard constraints.
       */
      const excludedBrands =
        cleanValues(
          intent.excluded_brands,
        );

      if (
        excludedBrands.length
      ) {
        const productText =
          norm(
            `${product.brand} ${product.name}`,
          );

        const excluded =
          excludedBrands.some(
            (brand) =>
              productText.includes(
                norm(brand),
              ),
          );

        if (excluded) {
          return false;
        }
      }

      return true;
    })
    .map((product) => {
      const budget =
        budgetScore(
          product,
          intent,
        );

      const requirement =
        requirementScore(
          product,
          intent,
        );

      const rating =
        ratingScore(product);

      const featureUseCase =
        featureUseCaseScore(
          product,
          intent,
        );

      const returnRisk =
        returnRiskScore(product);

      const margin =
        marginScore(product);

      const inventory =
        inventoryScore(product);

      /*
       * Buyer utility remains dominant.
       *
       * Buyer requirements: 30%
       * Budget:              20%
       * Rating:              15%
       * Feature/use case:    15%
       *
       * Merchant economics:
       *
       * Return risk:         10%
       * Margin:               7%
       * Inventory:            3%
       *
       * Total = 100%
       *
       * This prevents a high-margin product
       * from beating a significantly better
       * product purely for merchant benefit.
       */
      const rawScore =
        requirement * 0.30 +
        budget * 0.20 +
        rating * 0.15 +
        featureUseCase * 0.15 +
        returnRisk * 0.10 +
        margin * 0.07 +
        inventory * 0.03;

      const score = Math.max(
        0,
        Math.min(
          100,
          Math.round(rawScore),
        ),
      );

      return {
        product_id:
          product.id,

        sku:
          product.sku,

        score,

        factors: {
          budget_fit:
            budget,

          requirement_match:
            requirement,

          rating,

          feature_use_case_match:
            featureUseCase,

          return_risk:
            returnRisk,

          margin,

          inventory,
        },
      };
    })
    .sort((a, b) => {
      /*
       * Highest overall score first.
       */
      if (
        b.score !== a.score
      ) {
        return (
          b.score -
          a.score
        );
      }

      /*
       * If tied, prioritize buyer
       * requirement matching.
       */
      if (
        b.factors
          .requirement_match !==
        a.factors
          .requirement_match
      ) {
        return (
          b.factors
            .requirement_match -
          a.factors
            .requirement_match
        );
      }

      /*
       * Then rating.
       */
      if (
        b.factors.rating !==
        a.factors.rating
      ) {
        return (
          b.factors.rating -
          a.factors.rating
        );
      }

      /*
       * Then merchant margin.
       */
      return (
        b.factors.margin -
        a.factors.margin
      );
    });
}