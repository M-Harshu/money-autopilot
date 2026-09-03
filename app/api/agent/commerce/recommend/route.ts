import { NextResponse } from "next/server";
import { z } from "zod";

import { extractBuyerIntent } from "@/lib/agents/buyer-intent";
import { rankWebProducts } from "@/lib/commerce/web-ranking";
import { searchRealProducts } from "@/lib/commerce/web-products";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit/service";

const schema = z.object({
  message: z.string().min(1).max(2000),

  location: z.object({
    lat: z.number().finite(),
    lon: z.number().finite(),
  }),
});

/**
 * Web-commerce merchant decision.
 *
 * IMPORTANT:
 * We do NOT invent margin, return-risk,
 * inventory economics, or other merchant
 * data that the web product source does not provide.
 *
 * Buyer ranking remains the dominant signal.
 * This layer is responsible for making a
 * deterministic commerce decision over the
 * already-ranked real-world products.
 */
function selectMerchantProduct<
  T extends {
    id: string;
    price: number;
    available?: boolean;
    inventory?: number | null;
    source?: string;
  },
>(
  products: T[],
  rankings: Array<{
    product_id: string;
    score: number;
    factors: {
      budget_fit: number;
      requirement_match: number;
      rating: number;
      priority_match: number;
      availability: number;
    };
  }>,
) {
  if (!products.length) {
    return null;
  }

  const rankingMap = new Map(
    rankings.map((ranking) => [
      ranking.product_id,
      ranking,
    ]),
  );

  const scored = products.map((product) => {
    const ranking =
      rankingMap.get(product.id);

    const buyerScore =
      ranking?.score ?? 0;

    const availability =
      product.available !== false &&
      (product.inventory === null ||
        product.inventory === undefined ||
        product.inventory > 0)
        ? 100
        : 0;

    /*
     * We deliberately keep buyer utility
     * dominant because this is an agent
     * acting on behalf of the buyer.
     *
     * Buyer relevance: 85%
     * Availability:    10%
     * Price signal:      5%
     */
    const priceSignal =
      product.price > 0
        ? Math.max(
            0,
            Math.min(
              100,
              100 -
                Math.min(
                  product.price / 100,
                  100,
                ),
            ),
          )
        : 0;

    const merchantScore = Math.round(
      buyerScore * 0.85 +
        availability * 0.1 +
        priceSignal * 0.05,
    );

    return {
      product,
      ranking,
      merchantScore,
    };
  });

  scored.sort((a, b) => {
    if (
      b.merchantScore !==
      a.merchantScore
    ) {
      return (
        b.merchantScore -
        a.merchantScore
      );
    }

    /*
     * Prefer stronger buyer ranking
     * when merchant scores tie.
     */
    const buyerA =
      a.ranking?.score ?? 0;

    const buyerB =
      b.ranking?.score ?? 0;

    if (buyerB !== buyerA) {
      return buyerB - buyerA;
    }

    /*
     * Finally prefer lower price.
     */
    return (
      a.product.price -
      b.product.price
    );
  });

  return scored[0] ?? null;
}

function buildMerchantDecisionFactors<
  T extends {
    price: number;
    source?: string;
    available?: boolean;
    inventory?: number | null;
  },
>(
  selected: {
    product: T;
    ranking:
      | {
          score: number;
          factors: {
            budget_fit: number;
            requirement_match: number;
            rating: number;
            priority_match: number;
            availability: number;
          };
        }
      | undefined;
    merchantScore: number;
  },
) {
  const factors: string[] = [];

  if (selected.ranking) {
    factors.push(
      `buyer_score: ${selected.ranking.score}`,
    );

    factors.push(
      `budget_fit: ${selected.ranking.factors.budget_fit}`,
    );

    factors.push(
      `requirement_match: ${selected.ranking.factors.requirement_match}`,
    );

    factors.push(
      `rating: ${selected.ranking.factors.rating}`,
    );

    factors.push(
      `priority_match: ${selected.ranking.factors.priority_match}`,
    );

    factors.push(
      `availability: ${selected.ranking.factors.availability}`,
    );
  }

  factors.push(
    `price: ${selected.product.price}`,
  );

  factors.push(
    `source: ${
      selected.product.source ??
      "unknown"
    }`,
  );

  factors.push(
    `merchant_score: ${selected.merchantScore}`,
  );

  return factors;
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(
      await req.json(),
    );

    const merchant =
      await prisma.merchant.findFirst();

    if (!merchant) {
      throw new Error(
        "No merchant configured.",
      );
    }

    /*
     * =====================================================
     * 1. BUYER AGENT
     * =====================================================
     */

    const intent =
      await extractBuyerIntent(
        body.message,
      );

    await audit({
      merchantId: merchant.id,
      eventType:
        "BUYER_INTENT_DETECTED",
      actor: "buyer_agent",
      input: {
        message: body.message,
      },
      metadata: {
        intent,
      },
    });

    /*
     * =====================================================
     * 2. WEB PRODUCT SEARCH
     * =====================================================
     */

    const products =
      await searchRealProducts(
        intent,
        body.location,
      );

    await audit({
      merchantId: merchant.id,
      eventType:
        "WEB_PRODUCT_SEARCH",
      actor: "web_product_engine",
      metadata: {
        count: products.length,

        sources: [
          ...new Set(
            products.map(
              (product) =>
                product.source,
            ),
          ),
        ],
      },
    });

    if (!products.length) {
      await audit({
        merchantId: merchant.id,
        eventType:
          "RECOMMENDATION_GENERATED",
        actor: "commerce_orchestrator",
        result: "NO_RESULTS",
        reason:
          "No real-world products matched the buyer request.",
        metadata: {
          candidateCount: 0,
        },
      });

      return NextResponse.json({
        buyer_intent: intent,
        candidates: [],
        buyer_ranking: [],
        merchant_recommendation:
          null,
      });
    }

    /*
     * =====================================================
     * 3. BUYER RANKING
     * =====================================================
     */

    const rankings =
      rankWebProducts(
        products,
        intent,
      );

    const rankedProducts =
      rankings
        .map((ranking) =>
          products.find(
            (product) =>
              product.id ===
              ranking.product_id,
          ),
        )
        .filter(
          (
            product,
          ): product is NonNullable<
            typeof product
          > =>
            Boolean(product),
        )
        .slice(0, 12);

    const rankedResults =
      rankings.slice(0, 12);

    await audit({
      merchantId: merchant.id,
      eventType:
        "WEB_PRODUCT_RANKING",
      actor: "ranking_engine",
      metadata: {
        rankings: rankedResults,
      },
    });

    if (!rankedProducts.length) {
      await audit({
        merchantId: merchant.id,
        eventType:
          "RECOMMENDATION_GENERATED",
        actor: "commerce_orchestrator",
        result: "NO_QUALIFIED_PRODUCTS",
        reason:
          "Products were found, but none passed the buyer's hard constraints.",
        metadata: {
          searchedProducts:
            products.length,
          rankedProducts: 0,
        },
      });

      return NextResponse.json({
        buyer_intent: intent,
        candidates: [],
        buyer_ranking: [],
        merchant_recommendation:
          null,
      });
    }

    /*
     * =====================================================
     * 4. MERCHANT AGENT
     * =====================================================
     *
     * The web product pipeline does not expose
     * CatalogProduct economics such as margin and
     * returnRisk.
     *
     * Therefore we use a deterministic web-commerce
     * decision layer rather than pretending those
     * fields exist.
     */

    const merchantSelection =
      selectMerchantProduct(
        rankedProducts,
        rankedResults,
      );

    if (!merchantSelection) {
      throw new Error(
        "Merchant Agent could not select a product.",
      );
    }

    const selectedProduct =
      merchantSelection.product;

    const selectedRanking =
      merchantSelection.ranking;

    const decisionFactors =
      buildMerchantDecisionFactors(
        merchantSelection,
      );

    await audit({
      merchantId: merchant.id,
      eventType:
        "MERCHANT_DECISION",
      actor: "merchant_agent",
      result: "SELECTED",
      reason:
        "Selected the strongest available real-world product using buyer relevance, availability, price, and ranking signals.",
      metadata: {
        selected_product_id:
          selectedProduct.id,

        selected_product_name:
          selectedProduct.name,

        source:
          selectedProduct.source,

        price:
          selectedProduct.price,

        buyer_score:
          selectedRanking?.score ??
          null,

        merchant_score:
          merchantSelection.merchantScore,

        decision_factors:
          decisionFactors,
      },
    });

    /*
     * =====================================================
     * 5. RECOMMENDATION GENERATED
     * =====================================================
     */

    const recommendation = {
      selected_product_id:
        selectedProduct.id,

      reason:
        "Best match based on buyer requirements, product relevance, availability, and commerce ranking.",

      decision_factors:
        decisionFactors,

      merchant_score:
        merchantSelection.merchantScore,

      confidence:
        selectedRanking
          ? Math.max(
              0,
              Math.min(
                1,
                selectedRanking.score /
                  100,
              ),
            )
          : 0,
    };

    await audit({
      merchantId: merchant.id,
      eventType:
        "RECOMMENDATION_GENERATED",
      actor: "commerce_orchestrator",
      result: "SUCCESS",
      metadata: {
        selected_product_id:
          selectedProduct.id,

        source:
          selectedProduct.source,

        merchant_score:
          merchantSelection.merchantScore,

        confidence:
          recommendation.confidence,
      },
    });

    /*
     * =====================================================
     * 6. RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      buyer_intent: intent,

      candidates:
        rankedProducts,

      buyer_ranking:
        rankedResults,

      merchant_recommendation:
        recommendation,
    });
  } catch (error) {
    console.error(
      "Commerce recommendation error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Recommendation failed",
      },
      {
        status: 400,
      },
    );
  }
}