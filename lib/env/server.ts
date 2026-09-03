import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),

  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().min(1).default("openai/gpt-oss-20b"),

  QUICKCOMMERCE_API_KEY: z.string().min(1),

  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
});

export function env() {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      "Server configuration is incomplete: " +
        result.error.issues
          .map((issue) => issue.path.join("."))
          .join(", "),
    );
  }

  return result.data;
}