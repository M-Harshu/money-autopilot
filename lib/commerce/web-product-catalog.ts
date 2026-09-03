import { prisma } from "@/lib/db/client";
import type { WebProduct } from "@/lib/commerce/web-products";

const DEMO_MERCHANT_ID = "demo-merchant";

function safeSku(product: WebProduct) {
  const raw = `${product.source}-${product.id}`
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .toUpperCase();

  return `WEB-${raw}`.slice(0, 60);
}

export async function ensureWebProductInCatalog(
  product: WebProduct,
) {
  const sku = safeSku(product);

  const price = Number(product.price);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(
      "Web product has an invalid price.",
    );
  }

  /*
   * Web marketplace results do not provide our
   * internal merchant cost/margin data.
   *
   * For the demo checkout representation we keep
   * the internal cost at the product price, which
   * means margin = 0.
   *
   * We do NOT claim this is the merchant's actual
   * marketplace cost or profit.
   */
  const cost = price;
  const margin = 0;

  const existing =
    await prisma.product.findUnique({
      where: {
        sku,
      },
    });

  if (existing) {
    await prisma.inventory.upsert({
      where: {
        productId: existing.id,
      },
      update: {
        quantity:
          product.inventory ??
          (product.available ? 1 : 0),
      },
      create: {
        productId: existing.id,
        quantity:
          product.inventory ??
          (product.available ? 1 : 0),
      },
    });

    return existing;
  }

  const created =
    await prisma.product.create({
      data: {
        sku,
        brand:
          product.brand ||
          product.source,

        name: product.name,

        category:
          product.source === "amazon" ||
          product.source === "flipkart"
            ? "web_product"
            : "web_product",

        description:
          `${product.name} — external marketplace product from ${product.source}.`,

        price: price.toString(),

        cost: cost.toString(),

        margin: margin.toString(),

        rating:
          product.rating ??
          0,

        features: [],

        returnRisk: "unknown",

        relevantAccessories: [],

        merchantId:
          DEMO_MERCHANT_ID,

        inventory: {
          create: {
            quantity:
              product.inventory ??
              (product.available
                ? 1
                : 0),
          },
        },
      },
    });

  return created;
}