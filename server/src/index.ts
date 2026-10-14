import cors from "cors";
import express from "express";
import helmet from "helmet";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1).optional(),
  ALLOWED_ORIGINS: z.string().default(""),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error("Invalid server environment configuration.");
  process.exit(1);
}
const env = parsedEnv.data;

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "16kb", strict: true }));

const allowedOrigins = env.ALLOWED_ORIGINS
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Native app requests may not send an Origin header. Authentication is still
    // required for protected endpoints before any account data is returned.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "sai-sai-billing-api" });
});

// Billing intentionally fails closed until account authentication, persistent
// database access, and the official Bazaar/Myket verification adapters are configured.
// Do not return a trial or activate a subscription from this placeholder.
app.get("/subscription/status", (_req, res) => {
  res.status(503).json({
    error: "billing_not_configured",
    message: "سرویس اشتراک هنوز راه‌اندازی نشده است.",
  });
});

const storePurchaseSchema = z.object({
  provider: z.enum(["bazaar", "myket"]),
  productId: z.string().trim().min(1).max(160),
  purchaseToken: z.string().trim().min(1).max(4096),
}).strict();

app.post("/subscription/store/verify", (req, res) => {
  const input = storePurchaseSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "invalid_purchase_request" });
  }
  // Never grant access merely because the client supplied a token.
  return res.status(503).json({
    error: "store_verification_not_configured",
    message: "تأیید خرید فروشگاه هنوز به سرویس رسمی متصل نشده است.",
  });
});

app.post("/subscription/checkout", (_req, res) => {
  res.status(503).json({
    error: "web_checkout_not_configured",
    message: "پرداخت اینترنتی هنوز راه‌اندازی نشده است.",
  });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Error && err.message === "Origin not allowed") {
    return res.status(403).json({ error: "origin_not_allowed" });
  }
  console.error("Unhandled API error");
  return res.status(500).json({ error: "internal_server_error" });
});

app.listen(env.PORT, () => {
  console.log(`SAI SAI billing API listening on port ${env.PORT}`);
});