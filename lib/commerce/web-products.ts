import { env } from "@/lib/env/server";
import type { BuyerIntent } from "@/lib/agents/buyer-intent";

export type WebProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  mrp: number | null;
  currency: "INR";
  image: string | null;
  rating: number | null;
  ratingCount: number | null;
  available: boolean;
  inventory: number | null;
  quantity: string | null;
  seller: string;
  url: string;
  source: string;
};

type QuickCommerceProduct = {
  id?: string;
  name?: string;
  brand?: string | null;
  available?: boolean;
  images?: string[];
  mrp?: number | null;
  offer_price?: number | null;
  price?: number | null;
  quantity?: string | null;
  deeplink?: string;
  rating?: number | null;
  rating_count?: number | null;
  ratingCount?: number | null;
  inventory?: number | null;
  platform?: {
    name?: string;
  };
};

type GroupSearchResponse = {
  status?: string;
  data?: {
    query?: string;
    platforms?: string[];
    results?: Record<
      string,
      QuickCommerceProduct[]
    >;
  };
  error?: string;
  message?: string;
};

function getSearchPlatforms(
  intent: BuyerIntent,
) {
  const category = (
    intent.category ?? ""
  ).toLowerCase();

  if (
    category.includes("shoe") ||
    category.includes("fashion") ||
    category.includes("clothing") ||
    category.includes("dress") ||
    category.includes("apparel")
  ) {
    return [
      "Amazon",
      "Flipkart",
      "Myntra",
    ] as const;
  }

  if (
    category.includes("beauty") ||
    category.includes("makeup") ||
    category.includes("skincare") ||
    category.includes("cosmetic")
  ) {
    return [
      "Amazon",
      "Nykaa",
    ] as const;
  }

  return [
    "Amazon",
    "Flipkart",
  ] as const;
}

function cleanTerms(
  values:
    | string[]
    | null
    | undefined,
): string[] {
  return (values ?? [])
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0,
    )
    .map((value) =>
      value.trim(),
    );
}

function buildQuery(
  intent: BuyerIntent,
): string {
  const parts: string[] = [];

  /*
   * Product category.
   */
  if (intent.category) {
    parts.push(
      intent.category,
    );
  }

  /*
   * Intended use.
   */
  if (intent.use_case) {
    parts.push(
      intent.use_case,
    );
  }

  /*
   * Explicit product requirements.
   *
   * Example:
   * wireless
   * ANC
   */
  parts.push(
    ...cleanTerms(
      intent.product_requirements,
    ),
  );

  /*
   * Buyer priorities.
   *
   * Example:
   * excellent battery life
   * comfort
   */
  parts.push(
    ...cleanTerms(
      intent.priorities,
    ),
  );

  /*
   * Explicit preferred brands.
   */
  parts.push(
    ...cleanTerms(
      intent.preferred_brands,
    ),
  );

  /*
   * Remove duplicate terms while
   * preserving order.
   */
  return Array.from(
    new Set(
      parts
        .map((part) =>
          part.trim(),
        )
        .filter(Boolean),
    ),
  ).join(" ");
}

function normalizeProduct(
  product: QuickCommerceProduct,
  platformName: string,
): WebProduct | null {
  if (
    !product.id ||
    !product.name ||
    !product.deeplink
  ) {
    return null;
  }

  const price =
    product.offer_price ??
    product.price ??
    product.mrp ??
    null;

  if (
    price === null ||
    !Number.isFinite(
      Number(price),
    ) ||
    Number(price) <= 0
  ) {
    return null;
  }

  const rating =
    product.rating !== undefined &&
    product.rating !== null
      ? Number(product.rating)
      : null;

  const ratingCount =
    product.rating_count ??
    product.ratingCount ??
    null;

  const inventory =
    product.inventory !== undefined &&
    product.inventory !== null
      ? Number(product.inventory)
      : null;

  return {
    id:
      `${platformName}:${product.id}`,

    name:
      product.name.trim(),

    brand:
      (
        product.brand ?? ""
      ).trim(),

    price:
      Number(price),

    mrp:
      product.mrp !== undefined &&
      product.mrp !== null
        ? Number(product.mrp)
        : null,

    currency:
      "INR",

    image:
      product.images?.[0] ??
      null,

    rating:
      rating !== null &&
      Number.isFinite(rating)
        ? Math.max(
            0,
            Math.min(
              5,
              rating,
            ),
          )
        : null,

    ratingCount:
      ratingCount !== null &&
      Number.isFinite(
        Number(ratingCount),
      )
        ? Number(ratingCount)
        : null,

    available:
      product.available ??
      true,

    inventory,

    quantity:
      product.quantity ??
      null,

    seller:
      product.platform?.name ??
      platformName,

    url:
      product.deeplink,

    source:
      platformName,
  };
}

function matchesHardConstraints(
  product: WebProduct,
  intent: BuyerIntent,
): boolean {
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
   * Do not show unavailable products.
   */
  if (!product.available) {
    return false;
  }

  /*
   * Do not show explicitly
   * out-of-stock products.
   */
  if (
    product.inventory !== null &&
    product.inventory !== undefined &&
    product.inventory <= 0
  ) {
    return false;
  }

  /*
   * Excluded brands are hard constraints.
   */
  if (
    intent.excluded_brands?.length
  ) {
    const productBrand =
      product.brand.toLowerCase();

    const productName =
      product.name.toLowerCase();

    const excluded =
      intent.excluded_brands.some(
        (brand) => {
          const normalized =
            brand
              .toLowerCase()
              .trim();

          if (!normalized) {
            return false;
          }

          return (
            productBrand.includes(
              normalized,
            ) ||
            productName.includes(
              normalized,
            )
          );
        },
      );

    if (excluded) {
      return false;
    }
  }

  return true;
}

function deduplicateProducts(
  products: WebProduct[],
): WebProduct[] {
  const unique =
    new Map<
      string,
      WebProduct
    >();

  for (const product of products) {
    const nameKey =
      product.name
        .toLowerCase()
        .replace(
          /\s+/g,
          " ",
        )
        .trim();

    const brandKey =
      product.brand
        .toLowerCase()
        .trim();

    /*
     * Keep marketplaces separate.
     *
     * The same product on Amazon and
     * Flipkart should remain two options.
     */
    const key =
      `${brandKey}|${nameKey}|${product.source}`;

    const existing =
      unique.get(key);

    /*
     * If the same product appears
     * more than once on the same
     * marketplace, keep the cheaper one.
     */
    if (
      !existing ||
      product.price <
        existing.price
    ) {
      unique.set(
        key,
        product,
      );
    }
  }

  return Array.from(
    unique.values(),
  );
}

export async function searchRealProducts(
  intent: BuyerIntent,
  location: {
    lat: number;
    lon: number;
  },
): Promise<WebProduct[]> {
  const configuration =
    env();

  const query =
    buildQuery(intent);

  if (!query) {
    throw new Error(
      "Could not create a product search query from buyer intent.",
    );
  }

  const platforms =
    getSearchPlatforms(
      intent,
    );

  const url =
    new URL(
      "https://api.quickcommerceapi.com/v1/groupsearch",
    );

  url.searchParams.set(
    "q",
    query,
  );

  url.searchParams.set(
    "lat",
    String(
      location.lat,
    ),
  );

  url.searchParams.set(
    "lon",
    String(
      location.lon,
    ),
  );

  url.searchParams.set(
    "platforms",
    platforms.join(","),
  );

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",

        headers: {
          "X-API-Key":
            configuration.QUICKCOMMERCE_API_KEY,

          Accept:
            "application/json",
        },

        cache:
          "no-store",
      },
    );

  let body:
    GroupSearchResponse;

  try {
    body =
      (await response.json()) as GroupSearchResponse;
  } catch {
    throw new Error(
      `Product search returned invalid JSON (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      body.message ??
        body.error ??
        `Product search failed with status ${response.status}.`,
    );
  }

  if (
    body.status &&
    body.status !==
      "success"
  ) {
    throw new Error(
      body.message ??
        body.error ??
        "Product search failed.",
    );
  }

  const results =
    body.data?.results ??
    {};

  const products:
    WebProduct[] = [];

  /*
   * Collect every product returned
   * by every requested marketplace.
   */
  for (
    const platform of platforms
  ) {
    const platformProducts =
      results[platform] ??
      [];

    for (
      const product of
        platformProducts
    ) {
      const normalized =
        normalizeProduct(
          product,
          platform,
        );

      if (!normalized) {
        continue;
      }

      if (
        !matchesHardConstraints(
          normalized,
          intent,
        )
      ) {
        continue;
      }

      products.push(
        normalized,
      );
    }
  }

  /*
   * IMPORTANT:
   *
   * Do NOT use slice() here.
   *
   * Return every valid product
   * received from the external API.
   */
  return deduplicateProducts(
    products,
  );
}