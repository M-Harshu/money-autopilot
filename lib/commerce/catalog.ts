import { prisma } from "@/lib/db/client";
import type { BuyerIntent } from "@/lib/agents/buyer-intent";

export type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  price: number;
  cost: number;
  margin: number;
  rating: number;
  features: string[];
  returnRisk: string;
  relevantAccessories: string[];
  inventory: number;
  brand: string;
};

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

function normalizeCategory(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, "_");
}

function mapProduct(product: {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  price: unknown;
  cost: unknown;
  margin: unknown;
  rating: unknown;
  features: unknown;
  returnRisk: string;
  relevantAccessories: unknown;
  brand: string;
  inventory?: {
    quantity: number;
  } | null;
}): CatalogProduct {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    description: product.description,
    price: Number(product.price),
    cost: Number(product.cost),
    margin: Number(product.margin),
    rating: Number(product.rating),
    features: asStringArray(product.features),
    returnRisk: product.returnRisk,
    relevantAccessories: asStringArray(product.relevantAccessories),
    inventory: product.inventory?.quantity ?? 0,
    brand: product.brand,
  };
}

export async function searchCatalog(
  intent: BuyerIntent,
): Promise<CatalogProduct[]> {
  const where: {
    category?: string;
    price?: {
      lte: number;
    };
    inventory: {
      quantity: {
        gt: number;
      };
    };
  } = {
    inventory: {
      quantity: {
        gt: 0,
      },
    },
  };

  if (intent.category) {
    where.category = normalizeCategory(intent.category);
  }

  const budget =
    intent.budget_max === null || intent.budget_max === undefined
      ? undefined
      : intent.budget_max;

  if (budget !== undefined) {
    where.price = {
      lte: budget,
    };
  }

  const rows = await prisma.product.findMany({
    where,
    include: {
      inventory: true,
    },
  });

  return rows.map((product) =>
    mapProduct({
      ...product,
      inventory: product.inventory,
    }),
  );
}

export async function getProduct(
  id: string,
): Promise<CatalogProduct | null> {
  const product = await prisma.product.findUnique({
    where: {
      id,
    },
    include: {
      inventory: true,
    },
  });

  if (!product) {
    return null;
  }

  return mapProduct(product);
}

export async function getAvailableInventory(id: string): Promise<number> {
  const inventory = await prisma.inventory.findUnique({
    where: {
      productId: id,
    },
  });

  return inventory?.quantity ?? 0;
}