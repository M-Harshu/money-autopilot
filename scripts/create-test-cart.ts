import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const buyer = await prisma.buyerProfile.findUnique({
    where: {
      externalId: "demo-buyer",
    },
  });

  if (!buyer) {
    throw new Error("Demo buyer not found.");
  }

  const cart = await prisma.cart.create({
    data: {
      merchantId: "demo-merchant",
      buyerProfileId: buyer.id,
      status: "OPEN",
    },
  });

  console.log("Created test cart:");
  console.log(cart.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });