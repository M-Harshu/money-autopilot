import { NextResponse } from "next/server";
import { z } from "zod";
import { requestRetry } from "@/lib/recovery/service";

const schema = z.object({
  transactionId: z.string(),
  confirmed: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    const transaction = await requestRetry(
      body.transactionId,
      body.confirmed,
    );

    return NextResponse.json({ transaction });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Retry blocked",
      },
      { status: 400 },
    );
  }
}