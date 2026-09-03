import { NextResponse } from "next/server";
import { z } from "zod";
import { proposeUpsell } from "@/lib/commerce/upsell";

const schema = z.object({
  productId: z.string(),
  rejectedProductIds: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    const result = await proposeUpsell(
      body.productId,
      body.rejectedProductIds,
    );

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Upsell unavailable",
      },
      { status: 400 },
    );
  }
}