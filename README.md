# Money Autopilot

AI-native agentic commerce for the Razorpay AI Buildathon.

## Architecture

BUYER → Buyer Agent → PostgreSQL Catalog → deterministic Buyer Ranking → Merchant Agent → Recommendation → Cart → deterministic Policy Engine → Customer Approval → Razorpay Test Mode → server verification → bounded recovery → Audit → Observatory → Simulation.

**Core principle:** AI proposes. Deterministic code decides. Customer confirms. Server executes. Audit records everything.

Razorpay's documented server flow creates an Order on the server and requires server-side HMAC-SHA256 verification before fulfilment. Test Mode uses simulated payments and does not deduct real money. urlRazorpay Node integration docshttps://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/?preferred-country=IN

## Setup

Requirements: Node.js 20+, PostgreSQL, OpenAI API key, Razorpay Test Mode keys.

```bash
npm install
cp .env.example .env
npx prisma validate
npx prisma generate
npx prisma db push
npm run prisma:seed
npm test
npm run typecheck
npm run lint
npm run dev
```

Never commit `.env`. `RAZORPAY_KEY_SECRET` is server-only.

## Demo

1. Open `/`.
2. Enter a shopping request.
3. Buyer Agent extracts intent.
4. Catalog filters PostgreSQL products deterministically.
5. Ranking calculates explainable scores.
6. Merchant Agent chooses only supplied candidates.
7. Cart and policy validation protect financial amounts.
8. Payment creation uses the server-calculated cart total.
9. Razorpay Test Mode can be used for checkout.
10. `/dashboard` shows the agent architecture.
11. `POST /api/payment/simulate-failure` demonstrates deterministic failure.
12. `POST /api/recovery/retry` enforces the single-retry boundary.

## Security boundaries

- LLMs have no payment tools.
- Server recalculates cart totals from database prices.
- Inventory is checked server-side.
- Discount limit: 10%.
- Automatic upsell limit: ₹500.
- Automatic retry limit: 1.
- Automatic approval threshold: ₹10,000.
- Merchant Agent cannot select an unsupplied product.
- Razorpay secret never reaches the browser.
- Payment signatures are verified server-side using the server's stored Razorpay order ID.
- Successful transactions cannot transition back to pending.

## API

- `POST /api/agent/buyer/intent`
- `POST /api/agent/commerce/recommend`
- `POST /api/cart`
- `GET /api/cart?cartId=...`
- `POST /api/cart/items`
- `DELETE /api/cart/items`
- `POST /api/payment/create`
- `POST /api/payment/verify`
- `POST /api/payment/simulate-failure`
- `POST /api/payment/simulate-success`
- `POST /api/recovery/retry`
- `GET /api/transactions`
- `GET /api/audit`
- `GET /api/metrics`
- `POST /api/simulation/run`

## What broke and how we recovered

During development, Vitest initially could not resolve the TypeScript `@/*` alias, so Vite's `resolve.alias` was added. A Merchant Agent adversarial test also exposed awkward error wording; the candidate-boundary validation was retained and the message stabilized. Finally, an audit mock hit Vitest's hoisting behavior; `vi.hoisted()` made the mock initialization deterministic.

## Known limitations

- Payment checkout UI is intentionally minimal; Razorpay Test Mode order creation and server verification are implemented, while a polished checkout component can be added without changing the financial boundary.
- Simulation is deterministic synthetic evaluation, not evidence of production uplift.
- Authentication/rate limiting are not included in this hackathon repository.
