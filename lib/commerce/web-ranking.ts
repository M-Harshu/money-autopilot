import type { BuyerIntent } from "@/lib/agents/buyer-intent";
import type { WebProduct } from "@/lib/commerce/web-products";

export type WebProductRanking = {
  product_id: string;
  score: number;
  factors: {
    budget_fit: number;
    requirement_match: number;
    rating: number;
    priority_match: number;
    availability: number;
  };
};

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function cleanTerms(
  values: string[] | null | undefined,
): string[] {
  return (values ?? []).filter(
    (value): value is string =>
      typeof value === "string" &&
      value.trim().length > 0,
  );
}

function productText(
  product: WebProduct,
): string {
  return normalize(
    [
      product.name,
      product.brand,
      product.quantity ?? "",
    ].join(" "),
  );
}

/**
 * Extract battery life from product title/details.
 *
 * Supports:
 * 80H Battery
 * 80H Playtime
 * 80 Hours Battery Life
 * 80 Hrs Playtime
 * Battery: 80H
 * 120H Playtime
 */
function extractBatteryHours(
  product: WebProduct,
): number | null {
  const text = [
    product.name,
    product.quantity ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const patterns = [
    /(\d+(?:\.\d+)?)\s*h\s*(?:battery(?:\s+life)?|playtime|play\s*time)\b/i,

    /(\d+(?:\.\d+)?)\s*hrs?\s*(?:battery(?:\s+life)?|playtime|play\s*time)\b/i,

    /(\d+(?:\.\d+)?)\s*hours?\s*(?:battery(?:\s+life)?|playtime|play\s*time)\b/i,

    /(?:battery(?:\s+life)?|playtime|play\s*time)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*h\b/i,

    /(?:battery(?:\s+life)?|playtime|play\s*time)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*hrs?\b/i,

    /(?:battery(?:\s+life)?|playtime|play\s*time)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*hours?\b/i,

    /(\d+(?:\.\d+)?)\s*h(?:rs?|ours?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const hours = Number(match[1]);

    if (
      Number.isFinite(hours) &&
      hours > 0 &&
      hours <= 1000
    ) {
      return hours;
    }
  }

  return null;
}

function isBatteryPriority(
  priority: string,
): boolean {
  const value = normalize(priority);

  return (
    value.includes("battery") ||
    value.includes("playtime") ||
    value.includes("play time") ||
    value.includes("hours") ||
    value.includes("hrs")
  );
}

/**
 * Battery score when the user did NOT specify
 * an exact minimum battery requirement.
 */
function generalBatteryScore(
  product: WebProduct,
): number {
  const hours =
    extractBatteryHours(product);

  if (hours === null) {
    return 45;
  }

  if (hours <= 20) {
    return 40;
  }

  if (hours >= 80) {
    return 100;
  }

  if (hours >= 60) {
    return Math.round(
      92 +
        ((hours - 60) / 20) * 8,
    );
  }

  if (hours >= 50) {
    return Math.round(
      85 +
        ((hours - 50) / 10) * 7,
    );
  }

  if (hours >= 40) {
    return Math.round(
      75 +
        ((hours - 40) / 10) * 10,
    );
  }

  if (hours >= 30) {
    return Math.round(
      60 +
        ((hours - 30) / 10) * 15,
    );
  }

  return Math.round(
    40 +
      ((hours - 20) / 10) * 20,
  );
}

/**
 * Score a product against an explicit minimum
 * battery requirement.
 *
 * If user asks for 80H:
 *
 * 120H = 100
 * 100H = 99
 * 80H  = 95
 */
function requiredBatteryScore(
  product: WebProduct,
  minimumHours: number,
): number {
  const actualHours =
    extractBatteryHours(product);

  if (actualHours === null) {
    return 0;
  }

  if (actualHours >= minimumHours) {
    const extra =
      actualHours - minimumHours;

    return Math.min(
      100,
      Math.round(
        95 +
          Math.min(
            5,
            (extra /
              Math.max(
                minimumHours,
                1,
              )) *
              5,
          ),
      ),
    );
  }

  const ratio =
    actualHours / minimumHours;

  return Math.max(
    0,
    Math.min(
      94,
      Math.round(ratio * 95),
    ),
  );
}

function batteryPriorityScore(
  product: WebProduct,
  intent: BuyerIntent,
): number {
  if (
    intent.battery_hours_min !== null &&
    intent.battery_hours_min !== undefined
  ) {
    return requiredBatteryScore(
      product,
      intent.battery_hours_min,
    );
  }

  return generalBatteryScore(product);
}

/**
 * Semantic aliases for common buyer requirements.
 */
function termsForRequirement(
  requirement: string,
): string[] {
  const value = normalize(requirement);

  const aliases: Record<
    string,
    string[]
  > = {
    wireless: [
      "wireless",
      "bluetooth",
      "tws",
      "neckband",
    ],

    anc: [
      "anc",
      "noise cancellation",
      "noise cancelling",
      "active noise cancellation",
      "hybrid anc",
    ],

    "noise cancellation": [
      "noise cancellation",
      "noise cancelling",
      "anc",
      "active noise cancellation",
      "hybrid anc",
    ],

    comfort: [
      "comfort",
      "comfortable",
      "comfort fit",
      "lightweight",
      "light weight",
      "ergonomic",
      "soft ear",
      "soft cushion",
      "memory foam",
      "cushion",
      "cushioned",
      "adaptive fit",
      "adaptive",
      "comfortable fit",
      "all day comfort",
      "all day wear",
      "feather light",
      "featherlight",
      "lightweight design",
    ],

    "excellent comfort": [
      "comfort",
      "comfortable",
      "comfort fit",
      "lightweight",
      "light weight",
      "ergonomic",
      "soft ear",
      "soft cushion",
      "memory foam",
      "cushion",
      "cushioned",
      "adaptive fit",
      "adaptive",
      "comfortable fit",
      "all day comfort",
      "all day wear",
      "feather light",
      "featherlight",
      "lightweight design",
    ],

    "good comfort": [
      "comfort",
      "comfortable",
      "comfort fit",
      "lightweight",
      "light weight",
      "ergonomic",
      "soft ear",
      "soft cushion",
      "cushion",
      "cushioned",
      "adaptive fit",
      "all day comfort",
      "all day wear",
    ],

    "good sound": [
      "sound",
      "audio",
      "sound quality",
      "audio quality",
      "bass",
      "stereo",
      "deep bass",
      "rich audio",
      "rich sound",
      "clear sound",
      "clear audio",
      "hi res",
      "hi fi",
      "hifi",
      "high fidelity",
      "dynamic driver",
      "drivers",
    ],

    "good sound quality": [
      "sound",
      "audio",
      "sound quality",
      "audio quality",
      "bass",
      "stereo",
      "deep bass",
      "rich audio",
      "rich sound",
      "clear sound",
      "clear audio",
      "hi res",
      "hi fi",
      "hifi",
      "high fidelity",
      "dynamic driver",
      "drivers",
    ],

    "excellent sound quality": [
      "sound",
      "audio",
      "sound quality",
      "audio quality",
      "bass",
      "stereo",
      "deep bass",
      "rich audio",
      "rich sound",
      "clear sound",
      "clear audio",
      "hi res",
      "hi fi",
      "hifi",
      "high fidelity",
      "dynamic driver",
      "drivers",
    ],

    durability: [
      "durable",
      "durability",
      "water resistant",
      "waterproof",
      "ipx",
      "rugged",
      "strong build",
      "sturdy",
    ],

    "fast charging": [
      "fast charging",
      "quick charging",
      "rapid charging",
      "type c fast charging",
      "quick charge",
    ],
  };

  return aliases[value] ?? [value];
}

function matchesRequirement(
  text: string,
  requirement: string,
): boolean {
  const terms =
    termsForRequirement(requirement);

  return terms.some((term) => {
    const normalizedTerm =
      normalize(term);

    return (
      normalizedTerm.length > 0 &&
      text.includes(normalizedTerm)
    );
  });
}

function categoryMatches(
  text: string,
  category: string,
): boolean {
  const value = normalize(category);

  const aliases: Record<
    string,
    string[]
  > = {
    headphones: [
      "headphones",
      "headset",
      "over ear",
      "on ear",
      "neckband",
      "earphones",
      "earbuds",
      "tws",
    ],

    "running shoes": [
      "running shoes",
      "running shoe",
      "running",
      "road running",
      "running sneakers",
    ],

    laptop: [
      "laptop",
      "notebook",
      "notebook computer",
    ],

    smartphone: [
      "smartphone",
      "smart phone",
      "mobile phone",
      "android phone",
      "iphone",
    ],

    smartwatch: [
      "smartwatch",
      "smart watch",
      "fitness watch",
      "gps watch",
    ],

    television: [
      "television",
      "tv",
      "smart tv",
      "led tv",
      "oled",
    ],
  };

  const categoryTerms =
    aliases[value] ?? [value];

  return categoryTerms.some(
    (term) =>
      text.includes(normalize(term)),
  );
}

function budgetScore(
  product: WebProduct,
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

/**
 * Score one individual priority.
 */
function priorityMatchScore(
  product: WebProduct,
  priority: string,
  intent: BuyerIntent,
): number {
  if (isBatteryPriority(priority)) {
    return batteryPriorityScore(
      product,
      intent,
    );
  }

  const text = productText(product);
  const normalizedPriority =
    normalize(priority);

  if (!normalizedPriority) {
    return 0;
  }

  // Exact phrase in product data = strongest evidence.
  if (text.includes(normalizedPriority)) {
    return 100;
  }

  const terms =
    termsForRequirement(priority)
      .map(normalize)
      .filter(
        (term) => term.length > 0,
      );

  const matchedTerms =
    terms.filter((term) =>
      text.includes(term),
    );

  if (!matchedTerms.length) {
    return 0;
  }

  // Multiple independent supporting signals.
  if (matchedTerms.length >= 3) {
    return 92;
  }

  if (matchedTerms.length === 2) {
    return 88;
  }

  return 82;
}

/**
 * Calculate buyer priority score.
 *
 * Explicit textual priorities are evaluated
 * independently.
 *
 * Explicit battery minimum is included as an
 * additional priority signal.
 */
function priorityScore(
  product: WebProduct,
  intent: BuyerIntent,
): number {
  const priorities =
    cleanTerms(
      intent.priorities,
    );

  const hasExplicitBatteryRequirement =
    intent.battery_hours_min !== null &&
    intent.battery_hours_min !== undefined;

  if (
    !priorities.length &&
    !hasExplicitBatteryRequirement
  ) {
    return 75;
  }

  const scores: number[] = [];

  for (const priority of priorities) {
    scores.push(
      priorityMatchScore(
        product,
        priority,
        intent,
      ),
    );
  }

  if (hasExplicitBatteryRequirement) {
    scores.push(
      batteryPriorityScore(
        product,
        intent,
      ),
    );
  }

  if (!scores.length) {
    return 75;
  }

  const average =
    scores.reduce(
      (sum, score) =>
        sum + score,
      0,
    ) / scores.length;

  const sorted =
    [...scores].sort(
      (a, b) => b - a,
    );

  const top =
    sorted[0] ?? average;

  return Math.round(
    average * 0.7 +
      top * 0.3,
  );
}

function explicitRequirementScore(
  product: WebProduct,
  intent: BuyerIntent,
): number {
  const requirements =
    cleanTerms(
      intent.product_requirements,
    );

  if (!requirements.length) {
    return 75;
  }

  const text =
    productText(product);

  let matched = 0;

  for (const requirement of requirements) {
    if (
      matchesRequirement(
        text,
        requirement,
      )
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

/**
 * Combines explicit requirements, buyer
 * priorities, and category relevance.
 */
function requirementScore(
  product: WebProduct,
  intent: BuyerIntent,
): number {
  const explicit =
    explicitRequirementScore(
      product,
      intent,
    );

  const priorities =
    cleanTerms(
      intent.priorities,
    );

  const hasBatteryRequirement =
    intent.battery_hours_min !== null &&
    intent.battery_hours_min !== undefined;

  const priority =
    priorities.length ||
    hasBatteryRequirement
      ? priorityScore(
          product,
          intent,
        )
      : 75;

  const category =
    intent.category &&
    categoryMatches(
      productText(product),
      intent.category,
    )
      ? 100
      : 0;

  return Math.round(
    explicit * 0.55 +
      priority * 0.30 +
      category * 0.15,
  );
}

/**
 * Rating score with review-count confidence.
 *
 * The raw star rating remains the primary signal,
 * but products with very few reviews receive a
 * modest confidence reduction.
 *
 * Examples:
 *
 * 4.6 / 18 ratings
 * -> high rating, lower confidence
 *
 * 4.2 / 31,500 ratings
 * -> slightly lower rating, very high confidence
 */
function ratingScore(
  product: WebProduct,
): number {
  if (
    product.rating === null ||
    product.rating === undefined
  ) {
    return 60;
  }

  const rating = Math.max(
    0,
    Math.min(
      5,
      product.rating,
    ),
  );

  const baseScore =
    (rating / 5) * 100;

  const reviewCount =
    product.ratingCount ?? 0;

  /*
   * If there is no review count, reduce
   * confidence rather than pretending that
   * the rating is fully established.
   */
  if (reviewCount <= 0) {
    return Math.round(
      baseScore * 0.75,
    );
  }

  /*
   * Logarithmic confidence:
   *
   * - small review counts get a modest penalty
   * - confidence increases as evidence grows
   * - very large review counts do not dominate
   */
  const confidence =
    Math.min(
      1,
      Math.log10(
        reviewCount + 1,
      ) / 4,
    );

  /*
   * Keep 75% of the score at minimum confidence
   * and allow confidence to restore up to 100%.
   */
  const adjustedScore =
    baseScore *
    (0.75 +
      confidence * 0.25);

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        adjustedScore,
      ),
    ),
  );
}

function availabilityScore(
  product: WebProduct,
): number {
  if (!product.available) {
    return 0;
  }

  if (
    product.inventory !== null &&
    product.inventory !== undefined &&
    product.inventory <= 0
  ) {
    return 0;
  }

  return 100;
}

function matchesExplicitRequirements(
  product: WebProduct,
  intent: BuyerIntent,
): boolean {
  const requirements =
    cleanTerms(
      intent.product_requirements,
    );

  if (!requirements.length) {
    return true;
  }

  const text =
    productText(product);

  return requirements.every(
    (requirement) =>
      matchesRequirement(
        text,
        requirement,
      ),
  );
}

/**
 * HARD constraint for explicit minimum
 * battery life.
 */
function matchesBatteryRequirement(
  product: WebProduct,
  intent: BuyerIntent,
): boolean {
  if (
    intent.battery_hours_min === null ||
    intent.battery_hours_min === undefined
  ) {
    return true;
  }

  const actualHours =
    extractBatteryHours(product);

  if (actualHours === null) {
    return false;
  }

  return (
    actualHours >=
    intent.battery_hours_min
  );
}

function hardConstraintPenalty(
  product: WebProduct,
  intent: BuyerIntent,
): number {
  const text =
    productText(product);

  let penalty = 0;

  /*
   * Category mismatch is strongly penalized.
   */
  if (
    intent.category &&
    !categoryMatches(
      text,
      intent.category,
    )
  ) {
    penalty += 30;
  }

  /*
   * Preferred brand is a soft preference.
   */
  if (
    intent.preferred_brands?.length
  ) {
    const preferred =
      intent.preferred_brands.some(
        (brand) =>
          text.includes(
            normalize(brand),
          ),
      );

    if (!preferred) {
      penalty += 10;
    }
  }

  return penalty;
}

export function rankWebProducts(
  products: WebProduct[],
  intent: BuyerIntent,
): WebProductRanking[] {
  return products
    .filter((product) => {
      /*
       * HARD budget constraint.
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
       * HARD availability constraint.
       */
      if (!product.available) {
        return false;
      }

      if (
        product.inventory !== null &&
        product.inventory !== undefined &&
        product.inventory <= 0
      ) {
        return false;
      }

      /*
       * HARD explicit product requirements.
       */
      if (
        !matchesExplicitRequirements(
          product,
          intent,
        )
      ) {
        return false;
      }

      /*
       * HARD minimum battery requirement.
       */
      if (
        !matchesBatteryRequirement(
          product,
          intent,
        )
      ) {
        return false;
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

      const priority =
        priorityScore(
          product,
          intent,
        );

      const availability =
        availabilityScore(
          product,
        );

      const penalty =
        hardConstraintPenalty(
          product,
          intent,
        );

      /*
       * Final recommendation weighting:
       *
       * Budget       10%
       * Requirements 25%
       * Rating       20%
       * Priorities   35%
       * Availability 10%
       */
      const rawScore =
        budget * 0.10 +
        requirement * 0.25 +
        rating * 0.20 +
        priority * 0.35 +
        availability * 0.10;

      const score =
        Math.max(
          0,
          Math.min(
            100,
            Math.round(
              rawScore - penalty,
            ),
          ),
        );

      return {
        product_id:
          product.id,

        score,

        factors: {
          budget_fit:
            budget,

          requirement_match:
            requirement,

          rating,

          priority_match:
            priority,

          availability,
        },
      };
    })
    .sort((a, b) => {
      /*
       * Primary:
       * highest overall score.
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
       * better priority match.
       */
      if (
        b.factors.priority_match !==
        a.factors.priority_match
      ) {
        return (
          b.factors.priority_match -
          a.factors.priority_match
        );
      }

      /*
       * Tertiary:
       * better rating confidence score.
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
       * Final:
       * better budget fit.
       */
      return (
        b.factors.budget_fit -
        a.factors.budget_fit
      );
    });
}