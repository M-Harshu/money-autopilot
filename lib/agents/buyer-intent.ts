import OpenAI from "openai";
import { z } from "zod";
import { env } from "@/lib/env/server";

export const buyerIntentSchema = z.object({
  category: z.string().min(1).nullable(),

  budget_max: z.number().nonnegative().nullable(),

  use_case: z.string().min(1).nullable(),

  priorities: z.array(z.string()).nullable(),

  product_requirements: z
    .array(z.string())
    .nullable(),

  battery_hours_min: z
    .number()
    .positive()
    .nullable(),

  preferred_brands: z
    .array(z.string())
    .nullable(),

  excluded_brands: z
    .array(z.string())
    .nullable(),

  urgency: z
    .enum([
      "low",
      "normal",
      "high",
      "urgent",
    ])
    .nullable(),

  price_sensitivity: z
    .enum([
      "low",
      "medium",
      "high",
    ])
    .nullable(),
});

export type BuyerIntent =
  z.infer<typeof buyerIntentSchema>;

const nullableString = {
  anyOf: [
    {
      type: "string",
    },
    {
      type: "null",
    },
  ],
};

const nullableNumber = {
  anyOf: [
    {
      type: "number",
      minimum: 0,
    },
    {
      type: "null",
    },
  ],
};

const nullablePositiveNumber = {
  anyOf: [
    {
      type: "number",
      exclusiveMinimum: 0,
    },
    {
      type: "null",
    },
  ],
};

const nullableStringArray = {
  anyOf: [
    {
      type: "array",
      items: {
        type: "string",
      },
    },
    {
      type: "null",
    },
  ],
};

const nullableUrgency = {
  anyOf: [
    {
      type: "string",
      enum: [
        "low",
        "normal",
        "high",
        "urgent",
      ],
    },
    {
      type: "null",
    },
  ],
};

const nullablePriceSensitivity = {
  anyOf: [
    {
      type: "string",
      enum: [
        "low",
        "medium",
        "high",
      ],
    },
    {
      type: "null",
    },
  ],
};

const buyerIntentJsonSchema = {
  type: "object",

  additionalProperties: false,

  properties: {
    category: nullableString,

    budget_max: nullableNumber,

    use_case: nullableString,

    priorities: nullableStringArray,

    product_requirements:
      nullableStringArray,

    battery_hours_min:
      nullablePositiveNumber,

    preferred_brands:
      nullableStringArray,

    excluded_brands:
      nullableStringArray,

    urgency: nullableUrgency,

    price_sensitivity:
      nullablePriceSensitivity,
  },

  required: [
    "category",
    "budget_max",
    "use_case",
    "priorities",
    "product_requirements",
    "battery_hours_min",
    "preferred_brands",
    "excluded_brands",
    "urgency",
    "price_sensitivity",
  ],
};

export async function extractBuyerIntent(
  message: string,
): Promise<BuyerIntent> {
  const configuration = env();

  const client = new OpenAI({
    apiKey:
      configuration.GROQ_API_KEY,

    baseURL:
      "https://api.groq.com/openai/v1",
  });

  const response =
    await client.chat.completions.create({
      model:
        configuration.GROQ_MODEL,

      temperature: 0,

      messages: [
        {
          role: "system",

          content: `
You are a buyer-intent extraction agent.

Extract only information explicitly stated
or strongly implied by the user's shopping request.

IMPORTANT RULES:

1. If a value is not provided, return null.

2. NEVER return:
   - "unknown"
   - "unspecified"
   - "none"
   - "not specified"
   - ""
   - any other placeholder value

3. price_sensitivity MUST be exactly one of:
   - "low"
   - "medium"
   - "high"
   - null

4. If the user does not explicitly indicate
price sensitivity, return null.

5. urgency MUST be exactly one of:
   - "low"
   - "normal"
   - "high"
   - "urgent"
   - null

6. Do not invent brands.

7. Do not invent a budget.

8. Do not infer a preferred brand unless the
user explicitly asks for it.

9. priorities should contain general buyer
preferences.

Examples:

"comfortable headphones"
=> priorities: ["comfort"]

"excellent sound quality"
=> priorities: ["excellent sound quality"]

10. product_requirements must contain explicit
product characteristics or specifications that
the user requires.

Examples:

"wireless ANC headphones"
=> ["wireless", "ANC"]

"over-ear headphones"
=> ["over-ear"]

"waterproof running shoes"
=> ["waterproof"]

"running shoes with carbon plate"
=> ["carbon plate"]

"laptop with 16GB RAM and 512GB SSD"
=> ["16GB RAM", "512GB SSD"]

"4K OLED TV"
=> ["4K", "OLED"]

11. Do NOT put generic preferences into
product_requirements.

Example:

"comfortable headphones"

=> priorities:
["comfort"]

=> product_requirements:
[]

12. BATTERY REQUIREMENT:

If the user specifies a minimum battery
duration, extract the numeric number of hours
into battery_hours_min.

Examples:

"80 hours battery life"
=> battery_hours_min: 80

"at least 80 hours battery"
=> battery_hours_min: 80

"80H battery"
=> battery_hours_min: 80

"100 hours playback"
=> battery_hours_min: 100

"long battery life"
=> battery_hours_min: null

13. A specific battery-hour requirement MUST
NOT be placed inside priorities.

For example:

"I want headphones with 80 hours battery life"

=> priorities: []

=> battery_hours_min: 80

14. If the user says "good battery life" or
"excellent battery life" without specifying
hours, keep it as a priority.

Example:

"excellent battery life"

=> priorities:
["excellent battery life"]

=> battery_hours_min: null

15. Do NOT invent product requirements.

Only extract characteristics explicitly
requested by the user.

16. category should be concise.

17. use_case should describe how the buyer
intends to use the product.

18. Keep product requirements short and
searchable.

Preserve technical terms such as:

- ANC
- OLED
- AMOLED
- 4K
- 5G
- USB-C
- 16GB RAM
- 512GB SSD
- waterproof
- wireless
- over-ear
- noise cancelling

EXAMPLE 1:

User:
"I need wireless ANC headphones under ₹10000
with 80 hours battery life, excellent comfort,
and good sound quality."

Return:

{
  "category": "headphones",
  "budget_max": 10000,
  "use_case": null,
  "priorities": [
    "excellent comfort",
    "good sound quality"
  ],
  "product_requirements": [
    "wireless",
    "ANC"
  ],
  "battery_hours_min": 80,
  "preferred_brands": null,
  "excluded_brands": null,
  "urgency": null,
  "price_sensitivity": null
}

EXAMPLE 2:

User:
"I want wireless ANC headphones with good
battery life."

Return:

{
  "category": "headphones",
  "budget_max": null,
  "use_case": null,
  "priorities": [
    "good battery life"
  ],
  "product_requirements": [
    "wireless",
    "ANC"
  ],
  "battery_hours_min": null,
  "preferred_brands": null,
  "excluded_brands": null,
  "urgency": null,
  "price_sensitivity": null
}

EXAMPLE 3:

User:
"I want running shoes under ₹5000 that are
waterproof and durable."

Return:

{
  "category": "running shoes",
  "budget_max": 5000,
  "use_case": null,
  "priorities": [
    "durability"
  ],
  "product_requirements": [
    "waterproof"
  ],
  "battery_hours_min": null,
  "preferred_brands": null,
  "excluded_brands": null,
  "urgency": null,
  "price_sensitivity": null
}

EXAMPLE 4:

User:
"I need a laptop with 16GB RAM, 512GB SSD,
and good battery life under ₹70000."

Return:

{
  "category": "laptop",
  "budget_max": 70000,
  "use_case": null,
  "priorities": [
    "good battery life"
  ],
  "product_requirements": [
    "16GB RAM",
    "512GB SSD"
  ],
  "battery_hours_min": null,
  "preferred_brands": null,
  "excluded_brands": null,
  "urgency": null,
  "price_sensitivity": null
}

EXAMPLE 5:

User:
"I need cheap headphones and price is very
important."

Return:

{
  "category": "headphones",
  "budget_max": null,
  "use_case": null,
  "priorities": [],
  "product_requirements": [],
  "battery_hours_min": null,
  "preferred_brands": null,
  "excluded_brands": null,
  "urgency": null,
  "price_sensitivity": "high"
}

EXAMPLE 6:

User:
"I need premium headphones. Price doesn't
matter."

Return:

{
  "category": "headphones",
  "budget_max": null,
  "use_case": null,
  "priorities": [],
  "product_requirements": [],
  "battery_hours_min": null,
  "preferred_brands": null,
  "excluded_brands": null,
  "urgency": null,
  "price_sensitivity": "low"
}
`,
        },

        {
          role: "user",
          content: message,
        },
      ],

      response_format: {
        type: "json_schema",

        json_schema: {
          name: "buyer_intent",

          strict: true,

          schema:
            buyerIntentJsonSchema,
        },
      },
    });

  const content =
    response.choices[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Groq returned no buyer intent.",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    console.error(
      "Invalid JSON from Groq:",
      content,
    );

    throw new Error(
      "Groq returned invalid buyer intent JSON.",
    );
  }

  const result =
    buyerIntentSchema.safeParse(
      parsed,
    );

  if (!result.success) {
    console.error(
      "Invalid buyer intent:",
      result.error.flatten(),
      parsed,
    );

    throw new Error(
      "Groq returned invalid buyer intent.",
    );
  }

  return result.data;
}