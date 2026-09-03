import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ProductSeed = {
  sku: string;
  brand: string;
  category: string;
  description: string;
  price: string;
  cost: string;
  rating: number;
  features: string[];
  returnRisk: string;
  relevantAccessories: string[];
  quantity: number;
  name: string;
};

const products: ProductSeed[] = [
  {
    sku: "RUN-103",
    brand: "StrideFlow",
    name: "StrideFlow Daily Runner",
    category: "running_shoes",
    description: "Cushioned daily road runner with breathable mesh.",
    price: "3799",
    cost: "2799",
    rating: 4.6,
    features: ["comfort", "durability", "breathable", "road running"],
    returnRisk: "low",
    relevantAccessories: ["RUN-201"],
    quantity: 12,
  },
  {
    sku: "RUN-104",
    brand: "PaceCore",
    name: "PaceCore Daily Trainer",
    category: "running_shoes",
    description:
      "Stable value-focused daily trainer for moderate mileage.",
    price: "3499",
    cost: "2199",
    rating: 4.4,
    features: ["stability", "durability", "daily training"],
    returnRisk: "medium",
    relevantAccessories: ["RUN-201"],
    quantity: 4,
  },
  {
    sku: "RUN-201",
    brand: "Endurance",
    name: "Endurance Cushioned Running Socks",
    category: "running_accessories",
    description: "Moisture-wicking cushioned running socks.",
    price: "299",
    cost: "110",
    rating: 4.5,
    features: ["moisture wicking", "cushioning"],
    returnRisk: "low",
    relevantAccessories: [],
    quantity: 30,
  },
  {
    sku: "AUD-301",
    brand: "ClearSound",
    name: "ClearSound ANC Headphones",
    category: "headphones",
    description:
      "Wireless over-ear ANC headphones with 35-hour battery.",
    price: "6999",
    cost: "4700",
    rating: 4.5,
    features: ["ANC", "battery", "multipoint", "comfort"],
    returnRisk: "medium",
    relevantAccessories: ["AUD-302"],
    quantity: 9,
  },
  {
    sku: "AUD-302",
    brand: "AudioShield",
    name: "AudioShield Headphone Travel Case",
    category: "headphone_accessories",
    description:
      "Hard-shell protective headphone travel case.",
    price: "799",
    cost: "350",
    rating: 4.3,
    features: ["hard shell", "travel protection"],
    returnRisk: "low",
    relevantAccessories: [],
    quantity: 18,
  },
  {
    sku: "LAP-401",
    brand: "WorkPro",
    name: "WorkPro 14 Productivity Laptop",
    category: "laptop",
    description:
      "14-inch productivity laptop with 16GB RAM and 512GB SSD.",
    price: "64999",
    cost: "57000",
    rating: 4.6,
    features: ["16GB RAM", "512GB SSD", "battery", "productivity"],
    returnRisk: "medium",
    relevantAccessories: ["LAP-402"],
    quantity: 6,
  },
  {
    sku: "LAP-402",
    brand: "HubWorks",
    name: "HubWorks 7-Port USB-C Hub",
    category: "laptop_accessories",
    description:
      "Seven-port USB-C hub with HDMI and SD card support.",
    price: "2499",
    cost: "1100",
    rating: 4.4,
    features: ["USB-C", "HDMI", "SD"],
    returnRisk: "low",
    relevantAccessories: [],
    quantity: 22,
  },
  {
    sku: "WATCH-501",
    brand: "PulseTrack",
    name: "PulseTrack GPS Fitness Watch",
    category: "smartwatch",
    description:
      "GPS fitness watch with heart-rate tracking and seven-day battery.",
    price: "8999",
    cost: "6200",
    rating: 4.5,
    features: ["GPS", "heart-rate", "battery", "fitness"],
    returnRisk: "medium",
    relevantAccessories: ["WATCH-502"],
    quantity: 11,
  },
  {
    sku: "WATCH-502",
    brand: "PulseTrack",
    name: "PulseTrack Sport Replacement Band",
    category: "smartwatch_accessories",
    description: "Breathable replacement sport band.",
    price: "699",
    cost: "250",
    rating: 4.6,
    features: ["breathable", "sweat resistant"],
    returnRisk: "low",
    relevantAccessories: [],
    quantity: 25,
  },
];

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: {
      id: "demo-merchant",
    },
    update: {
      name: "Apex Commerce Demo",
    },
    create: {
      id: "demo-merchant",
      name: "Apex Commerce Demo",
    },
  });

  const buyerProfile = await prisma.buyerProfile.upsert({
    where: {
      externalId: "demo-buyer",
    },
    update: {},
    create: {
      externalId: "demo-buyer",
      preferences: {
        demo: true,
      },
    },
  });

  for (const product of products) {
    const createdProduct = await prisma.product.upsert({
      where: {
        sku: product.sku,
      },
      update: {
        brand: product.brand,
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price,
        cost: product.cost,
        margin: (
          Number(product.price) - Number(product.cost)
        ).toString(),
        rating: product.rating,
        returnRisk: product.returnRisk,
        features: product.features,
        relevantAccessories: product.relevantAccessories,
        merchantId: merchant.id,
      },
      create: {
        sku: product.sku,
        brand: product.brand,
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price,
        cost: product.cost,
        margin: (
          Number(product.price) - Number(product.cost)
        ).toString(),
        rating: product.rating,
        returnRisk: product.returnRisk,
        features: product.features,
        relevantAccessories: product.relevantAccessories,
        merchantId: merchant.id,
      },
    });

    await prisma.inventory.upsert({
      where: {
        productId: createdProduct.id,
      },
      update: {
        quantity: product.quantity,
      },
      create: {
        productId: createdProduct.id,
        quantity: product.quantity,
      },
    });
  }

  await prisma.policy.upsert({
    where: {
      name: "default",
    },
    update: {},
    create: {
      name: "default",
      merchantId: merchant.id,
      maxDiscountPercent: "10",
      maxAutomaticUpsell: "500",
      maxAutomaticRetry: 1,
      approvalThreshold: "10000",
    },
  });

  console.log("Seeded demo merchant and catalog.");
  console.log(`Demo buyer profile ID: ${buyerProfile.id}`);
  console.log(`Demo buyer external ID: ${buyerProfile.externalId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });