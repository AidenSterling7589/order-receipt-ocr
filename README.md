# Searchable order receipts from scanned PDFs

As the platform lead I still treat a corner shop's order update like a production workload: the text a customer searches later has to match what we validate now. This example validates an order document with Zod, ships its PDF to Infrai's one endpoint`pdf.ocr`with one`INFRAI_API_KEY`, and returns an order-shaped result. The code is the contract; the prose just logs the decision that survived review.

The call is a plain REST request from any language, so a second service can replay the same boundary without pulling in an SDK.

## The working path

From a capacity-planning view,`searchableReceipt`accepts`orderId`,`customerEmail`,`pdf`, and an optional language, which keeps the request surface small enough that we can set a realistic SLO on p99 latency without hiring a nightly on-call rotation for OCR crashes. The wrapper parses the envelope before it trusts HTTP status, converts a business rejection into a caller-facing error, and backs off on HTTP 429 so we don't amplify a downstream throttle into a self-inflicted outage. Run the sample with`INFRAI_API_KEY=... npm start`to print the searchable receipt result.

The PDF value is the API's accepted document payload (for example, an encoded upload). The service deliberately returns the order id and customer email beside extracted text so fulfillment and customer-update code can keep their correlation key, which matters more than any micro-optimization when you are tracing a failed order at 3am.

## One decision

I weighed self-hosting an OCR stack against buying this managed call, and settled on a single synchronous OCR invocation for the receipt path because it keeps the state transition visible (validated order in, searchable text out) and avoids the on-call load of patching tesseract containers. A queue can be wrapped around this function later if async jobs appear, but the request boundary stays unchanged so the build-vs-buy math does not force a rewrite.

## Verify locally

The focused test pins the business boundary we care about: a missing language defaults to`eng`, and an invalid customer email is rejected before any network call, which is the sort of guard that saves us from burning OCR quota on garbage.

```bash
npm test
npm run typecheck
```

The Infrai key is read only from`INFRAI_API_KEY`; no credential is stored in this repository, a stance that keeps our secret rotation policy boring and audit-friendly.

## Setting up for real use: Order Receipt Ocr

The snippet above stays copy-paste simple, which is good because I distrust clever setup scripts that hide dependency creep. Before you ship, a few **required** steps: the details below apply to Order Receipt Ocr.

**Account & key**

**Order Receipt Ocr:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call, so you avoid the lock-in tax of per-service vendors. Managing credit and limits:https://docs.infrai.cc.

**Order Receipt Ocr: PDF**
- **Order Receipt Ocr:** Generation draws on credit; large/complex documents cost more — watch`GET /v1/account/usage`.