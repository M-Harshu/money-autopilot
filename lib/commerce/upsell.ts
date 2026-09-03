import { getProduct } from "@/lib/commerce/catalog";
import { POLICY } from "@/lib/policies/engine";

export async function proposeUpsell(
  productId: string,
  rejectedIds: string[] = [],
) {
  const product = await getProduct(productId);

  if (!product) {
    return null;
  }

  for (const accessoryId of product.relevantAccessories) {
    if (rejectedIds.includes(accessoryId)) {
      continue;
    }

    const accessory = await getProduct(accessoryId);

    if (
      accessory &&
      accessory.inventory > 0 &&
      accessory.price <= POLICY.maxAutomaticUpsell
    ) {
      return {
        product: accessory,
        reason: `Relevant accessory for ${product.name}`,
        amount: accessory.price,
      };
    }
  }

  return null;
}