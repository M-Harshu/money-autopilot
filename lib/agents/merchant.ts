import OpenAI from "openai";
import { z } from "zod";

import { env } from "@/lib/env/server";
import type { BuyerIntent } from "@/lib/agents/buyer-intent";
import type { CatalogProduct } from "@/lib/commerce/catalog";
import type { BuyerRanking } from "@/lib/commerce/ranking";

export const merchantRecommendationSchema =
  z.object({
    selected_product_id: z.string(),

    confidence: z
      .number()
      .min(0)
      .max(1),

    expected_margin: z
      .number()
      .nonnegative(),

    decision_factors: z
      .array(z.string())
      .min(1),

    reason: z
      .string()
      .min(1),
  });

export type MerchantRecommendation =
  z.infer<
    typeof merchantRecommendationSchema
  >;

export function validateMerchantRecommendation(
  recommendation: MerchantRecommendation,
  candidates: Pick<
    CatalogProduct,
    "id" | "margin"
  >[],
): MerchantRecommendation {
  const selected =
    candidates.find(
      (candidate) =>
        candidate.id ===
        recommendation.selected_product_id,
    );

  if (!selected) {
    throw new Error(
      "Merchant Agent selected a product outside the supplied candidate set.",
    );
  }

  if (
    Math.abs(
      recommendation.expected_margin -
        selected.margin,
    ) > 0.01
  ) {
    throw new Error(
      "Merchant Agent returned an expected margin that does not match the catalog.",
    );
  }

  return recommendation;
}

function buyerRankingScore(
  ranking: BuyerRanking | undefined,
): number {
  if (!ranking) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      ranking.score,
    ),
  );
}

function marginScore(
  product: CatalogProduct,
): number {
  if (
    product.price <= 0 ||
    product.margin <= 0
  ) {
    return 0;
  }

  const percentage =
    (product.margin /
      product.price) *
    100;

  /*
   * 40% gross margin or higher gets
   * the maximum merchant score.
   */
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (percentage / 40) *
          100,
      ),
    ),
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

function calculateMerchantScore(
  product: CatalogProduct,
  ranking: BuyerRanking | undefined,
): number {
  const buyerScore =
    buyerRankingScore(ranking);

  const margin =
    marginScore(product);

  const returnRisk =
    returnRiskScore(product);

  const inventory =
    inventoryScore(product);

  /*
   * Buyer utility remains the largest
   * factor.
   *
   * Buyer score: 55%
   * Margin:      25%
   * Return risk: 15%
   * Inventory:    5%
   *
   * Merchant economics influence the
   * decision but cannot overwhelm buyer
   * relevance.
   */
  return Math.round(
    buyerScore * 0.55 +
      margin * 0.25 +
      returnRisk * 0.15 +
      inventory * 0.05,
  );
}

function selectDeterministically(
  candidates: CatalogProduct[],
  rankings: BuyerRanking[],
): {
  product: CatalogProduct;
  score: number;
  ranking: BuyerRanking | undefined;
} {
  if (!candidates.length) {
    throw new Error(
      "No candidates available.",
    );
  }

  const rankingMap =
    new Map(
      rankings.map(
        (ranking) => [
          ranking.product_id,
          ranking,
        ],
      ),
    );

  const scored =
    candidates.map(
      (product) => {
        const ranking =
          rankingMap.get(
            product.id,
          );

        return {
          product,
          ranking,
          score:
            calculateMerchantScore(
              product,
              ranking,
            ),
        };
      },
    );

  scored.sort(
    (a, b) => {
      /*
       * Primary:
       * merchant economic score.
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
       * Secondary:
       * stronger buyer ranking.
       */
      const buyerA =
        buyerRankingScore(
          a.ranking,
        );

      const buyerB =
        buyerRankingScore(
          b.ranking,
        );

      if (
        buyerB !== buyerA
      ) {
        return (
          buyerB -
          buyerA
        );
      }

      /*
       * Tertiary:
       * higher absolute margin.
       */
      if (
        b.product.margin !==
        a.product.margin
      ) {
        return (
          b.product.margin -
          a.product.margin
        );
      }

      /*
       * Final:
       * lower price.
       */
      return (
        a.product.price -
        b.product.price
      );
    },
  );

  const selected =
    scored[0];

  if (!selected) {
    throw new Error(
      "Unable to select merchant product.",
    );
  }

  return selected;
}

function buildDecisionFactors(
  product: CatalogProduct,
  ranking: BuyerRanking | undefined,
  merchantScore: number,
): string[] {
  const factors: string[] = [];

  if (ranking) {
    factors.push(
      `buyer_score: ${ranking.score}`,
    );
  }

  factors.push(
    `margin: ${product.margin}`,
  );

  factors.push(
    `margin_score: ${marginScore(product)}`,
  );

  factors.push(
    `return_risk: ${product.returnRisk}`,
  );

  factors.push(
    `return_risk_score: ${returnRiskScore(product)}`,
  );

  factors.push(
    `inventory: ${product.inventory}`,
  );

  factors.push(
    `inventory_score: ${inventoryScore(product)}`,
  );

  factors.push(
    `merchant_score: ${merchantScore}`,
  );

  return factors;
}

function calculateConfidence(
  selectedScore: number,
  secondBestScore: number | null,
): number {
  if (
    secondBestScore === null
  ) {
    return 0.9;
  }

  const gap =
    Math.max(
      0,
      selectedScore -
        secondBestScore,
    );

  /*
   * Confidence represents how clearly
   * the deterministic ranking selected
   * the winner.
   */
  return Math.max(
    0.5,
    Math.min(
      0.99,
      0.65 +
        gap / 100,
    ),
  );
}

export async function recommendMerchantProduct(
  intent: BuyerIntent,
  candidates: CatalogProduct[],
  rankings: BuyerRanking[],
): Promise<MerchantRecommendation> {
  if (!candidates.length) {
    throw new Error(
      "No candidates available.",
    );
  }

  /*
   * The product selection itself is
   * deterministic.
   *
   * The LLM must never be trusted to
   * invent a product ID or override the
   * financial decision.
   */
  const selected =
    selectDeterministically(
      candidates,
      rankings,
    );

  const ranking =
    selected.ranking;

  const merchantScore =
    selected.score;

  /*
   * Determine the second-best score
   * for confidence calculation.
   */
  const allScores =
    candidates
      .map((product) =>
        calculateMerchantScore(
          product,
          rankings.find(
            (ranking) =>
              ranking.product_id ===
              product.id,
          ),
        ),
      )
      .sort(
        (a, b) => b - a,
      );

  const secondBestScore =
    allScores.length > 1
      ? allScores[1] ?? null
      : null;

  const confidence =
    calculateConfidence(
      merchantScore,
      secondBestScore,
    );

  const decisionFactors =
    buildDecisionFactors(
      selected.product,
      ranking,
      merchantScore,
    );

  /*
   * Generate only the human-readable
   * explanation with the LLM.
   *
   * Selection and expected margin have
   * already been determined by code.
   */
  const configuration = env();

  const client =
    new OpenAI({
      apiKey:
        configuration.GROQ_API_KEY,

      baseURL:
        "https://api.groq.com/openai/v1",
    });

  let reason =
    "Selected using deterministic buyer utility and merchant economics.";

  try {
    const response =
      await client.chat.completions.create(
        {
          model:
            configuration.GROQ_MODEL,

          temperature: 0,

          messages: [
            {
              role: "system",

              content: `
You are the explanation layer for a commerce decision system.

Do not select products.
Do not change scores.
Do not invent facts.
Do not provide chain-of-thought.

The product has already been selected deterministically.

Write one concise sentence explaining why the selected product is appropriate.

Mention buyer relevance first, then merchant economics.

Return only the explanation text.
              `.trim(),
            },

            {
              role: "user",

              content:
                JSON.stringify({
                  buyer_intent:
                    intent,

                  selected_product:
                    {
                      id:
                        selected.product.id,

                      name:
                        selected.product.name,

                      price:
                        selected.product.price,

                      margin:
                        selected.product.margin,

                      returnRisk:
                        selected.product
                          .returnRisk,

                      inventory:
                        selected.product
                          .inventory,
                    },

                  buyer_ranking:
                    ranking,

                  merchant_score:
                    merchantScore,

                  decision_factors:
                    decisionFactors,
                }),
            },
          ],
        },
      );

    const generated =
      response.choices[0]
        ?.message?.content
        ?.trim();

    if (generated) {
      reason = generated;
    }
  } catch (error) {
    /*
     * Explanation generation should
     * never invalidate a deterministic
     * commerce decision.
     */
    console.error(
      "Merchant explanation generation failed:",
      error,
    );
  }

  const recommendation: MerchantRecommendation =
    {
      selected_product_id:
        selected.product.id,

      confidence,

      expected_margin:
        selected.product.margin,

      decision_factors:
        decisionFactors,

      reason,
    };

  /*
   * Final safety validation.
   */
  return validateMerchantRecommendation(
    merchantRecommendationSchema.parse(
      recommendation,
    ),
    candidates,
  );
}