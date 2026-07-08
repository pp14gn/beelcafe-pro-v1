## What we're building

A public "order-from-anywhere" system so an external website can send orders straight into your POS — like an Uber Eats intake, but self-hosted.

Three pieces:

1. **Public API** in your backend that any website can call to fetch the menu and submit orders.
2. **A standalone ordering website** shipped as a starter (`/order.html`) so you have something working out of the box. Any external site can also use the API.
3. **Online Orders view in the POS** so cashiers see incoming orders in real time and accept / fulfill them.

## User flow

```text
Customer on external site
   │
   ├─ GET  /public-menu           → categories, recipes, sizes, prices
   ├─ POST /public-order-intake   → submits cart + contact + fulfillment
   │        └─ if pay-online → returns MercadoPago checkout URL
   │        └─ if pay-later  → order lands in POS as "pending"
   ▼
Cashier in POS → Orders → "Online" tab
   ├─ sees new order (realtime), customer, items, pickup/delivery, paid status
   ├─ Accept → status = preparing
   ├─ Ready  → status = ready (customer sees status via /order-status/:id)
   └─ Complete → deducts inventory, records sale, closes order
```

## Data model

New table `online_orders` (separate from the existing `orders` table which is tied to shifts/cashiers):

- `customer_name`, `customer_phone`, `customer_email`
- `fulfillment_type`: `pickup` | `delivery`
- `pickup_time` (nullable), `delivery_address` (nullable), `delivery_notes`
- `items` (JSONB — snapshot of cart: recipe id, name, size, modifiers, qty, unit price)
- `subtotal`, `total`
- `payment_method`: `counter` | `online_card`
- `payment_status`: `pending` | `paid` | `failed`
- `payment_reference` (MercadoPago preference/payment id)
- `status`: `new` | `accepted` | `preparing` | `ready` | `completed` | `cancelled`
- `source` (e.g. "web", or the domain that submitted it) — for future multi-site use
- Timestamps

RLS: no public read/write. All access via edge functions using service role. Authenticated staff can read/update.

## Edge functions (all `verify_jwt=false`, public)

- `public-menu` — returns active categories, recipes, sizes, and (optionally) modifiers, filtered to what customers should see. Read-only.
- `public-order-intake` — validates cart with Zod, re-prices server-side against the DB (never trust client prices), inserts `online_orders` row.
  - If `payment_method=online_card`: creates a MercadoPago Checkout Pro **preference** using the existing `MERCADOPAGO_ACCESS_TOKEN`, returns `{ order_id, checkout_url }`.
  - If `counter`: returns `{ order_id }` immediately.
- `mercadopago-webhook` — receives MP payment notifications, marks the matching order `paid` (or `failed`).
- `public-order-status` — lets the customer poll their order (`/order-status/:id`) for status updates without auth.

CORS: `Access-Control-Allow-Origin: *` on all four so any external site can call them.

## POS changes

- New tab **"Online"** on the existing `Orders` page listing `online_orders` (realtime via Supabase channel). Sound + toast on new order.
- Actions: Accept, Mark ready, Complete (on Complete, deduct inventory using the existing `process-sale-inventory` function and insert a `sales` row so revenue/analytics stay correct), Cancel/Refund.
- Small badge in the sidebar showing count of `new` online orders.

## Standalone ordering site

Ships at `public/order.html` — a single self-contained page (Tailwind CDN, vanilla JS) that:

- Calls `public-menu` to render categories → items → size picker → cart.
- Collects name/phone, pickup-vs-delivery, address or pickup time, notes.
- Choice of "Pay at counter" or "Pay by card now" (redirects to MercadoPago).
- Success page polls `public-order-status` and shows live status ("Preparing → Ready for pickup").

Accessible at `https://<your-domain>/order.html`. You can also embed / host it anywhere else and point it at your backend URL — it's just HTML+JS calling the public API.

## Payments

- **Counter**: nothing extra, cashier charges on pickup/delivery.
- **Online card**: MercadoPago Checkout Pro (browser redirect), reusing the existing `MERCADOPAGO_ACCESS_TOKEN` secret. This is separate from the in-store Point terminal flow you already have. The webhook flips `payment_status` to `paid` before the order is fulfilled.

## Out of scope for this pass

- Multiple external storefronts with per-site API keys (single public endpoint for now; `source` field is there for later).
- Delivery driver dispatch / maps.
- SMS notifications (can add via GatewayAPI/Twilio later).

## Order of work

1. Migration: `online_orders` table + RLS + grants + realtime.
2. Edge functions: `public-menu`, `public-order-intake`, `mercadopago-webhook`, `public-order-status`.
3. POS: "Online" tab on Orders page + realtime + sidebar badge + fulfillment actions (with inventory deduction + sale record).
4. `public/order.html` standalone site.
5. Smoke test end-to-end with `curl_edge_functions`.

Shall I proceed?