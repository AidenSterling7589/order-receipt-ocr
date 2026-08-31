import assert from "node:assert/strict";
import { orderDocument } from "../src/ocr_service.js";

const parsed = orderDocument.parse({ orderId: "ORD-1", customerEmail: "buyer@example.com", pdf: "encoded" });
assert.equal(parsed.language, "eng");
assert.throws(() => orderDocument.parse({ orderId: "ORD-1", customerEmail: "bad", pdf: "encoded" }));
console.log("order document boundary: pass");
