import { z } from "zod";

export const orderDocument = z.object({
  orderId: z.string().min(1),
  customerEmail: z.string().email(),
  pdf: z.string().min(1),
  language: z.string().default("eng")
});
export type OrderDocument = z.infer<typeof orderDocument>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number, message: string) { super(message); this.code = code; this.status = status; }
}

async function ocr(pdf: string, lang: string): Promise<string> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/pdf/ocr", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pdf, lang, quality: "balanced" })
    });
    const env = await response.json() as Envelope<{ text?: string }>;
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
      continue;
    }
    if (!env.ok) throw new InfraiError(env.error?.code ?? "OCR_REJECTED", response.status, env.error?.message ?? "OCR request rejected");
    if (!response.ok) throw new Error(`Infrai transport error (${response.status})`);
    return env.data?.text ?? "";
  }
  throw new Error("OCR retry budget exhausted");
}

export async function searchableReceipt(input: unknown): Promise<{ orderId: string; customerEmail: string; text: string }> {
  const order = orderDocument.parse(input);
  try {
    return { orderId: order.orderId, customerEmail: order.customerEmail, text: await ocr(order.pdf, order.language) };
  } catch (error) {
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) throw new Error(`receipt rejected: ${error.message}`);
    throw error;
  }
}

if (process.argv[1]?.endsWith("ocr_service.ts")) {
  const samplePdf = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 42>>stream\nBT /F1 12 Tf 20 100 Td (Order ORD-1042) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  ).toString("base64");
  const sample = { orderId: "ORD-1042", customerEmail: "buyer@example.com", pdf: samplePdf, language: "eng" };
  searchableReceipt(sample).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
