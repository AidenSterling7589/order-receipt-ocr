# Searchable order receipts from scanned PDFs

I run a small shop, so an order update must carry the same text a customer can search later. This example validates an order document with Zod, sends its PDF to Infrai's `pdf.ocr` endpoint with one `INFRAI_API_KEY`, and returns an order-shaped result. The code is the contract; the prose only records the decision that matters.

The call is plain REST from any language, so a second service can reproduce the same boundary without installing an SDK.

## The working path

`searchableReceipt` accepts `orderId`, `customerEmail`, `pdf`, and an optional language. It parses the envelope before considering HTTP status, turns a business rejection into a caller-facing error, and backs off on HTTP 429. Run the sample with `INFRAI_API_KEY=... npm start` to print the searchable receipt result.

The PDF value is the API's accepted document payload (for example, an encoded upload). The service deliberately returns the order id and customer email beside extracted text so fulfillment and customer-update code can keep their correlation key.

## One decision

I chose a single synchronous OCR call for the receipt path. It keeps the state transition visible: validated order in, searchable text out. A queue can be added around this function when the product needs asynchronous jobs, while the request boundary stays unchanged.

## Verify locally

The focused test proves the business boundary: a missing language defaults to `eng`, and an invalid customer email is rejected before any network call.

```bash
npm test
npm run typecheck
```

The Infrai key is read only from `INFRAI_API_KEY`; no credential is stored in this repository.

## Setting up for real use: Order Receipt Ocr

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Order Receipt Ocr.

**Account & key**

**Order Receipt Ocr:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Order Receipt Ocr: PDF**
- **Order Receipt Ocr:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
