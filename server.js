import express from "express";
import { createX402Server } from "@coinbase/cdp-sdk/x402";
import {
  paymentMiddleware,
  paymentMiddlewareFromHTTPServer,
  x402ResourceServer,
} from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { renderHomepage } from "./site.js";

const PORT = Number(process.env.PORT ?? process.env.X402_DEMO_PORT ?? 8402);
const HOST = process.env.HOST ?? "0.0.0.0";
const PAY_TO = process.env.X402_PAY_TO ?? "0x711affb5dBc344b7D7BeB54a9870824bc3eB7F5d";
const NETWORK = "eip155:8453";
const PRICE = "$0.01";
const ATOMIC_AMOUNT = "10000";
const routes = {
  "GET /demo": {
    accepts: {
      scheme: "exact",
      network: NETWORK,
      price: PRICE,
      payTo: PAY_TO,
      extra: { assetTransferMethod: "permit2" },
    },
    description: "x402 Agent payment proof of concept",
    mimeType: "application/json",
  },
};

if (!/^0x[0-9a-fA-F]{40}$/.test(PAY_TO)) {
  throw new Error("X402_PAY_TO must be a valid EVM address");
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
let paymentServer;
let liveSettlement = false;

function publicBaseUrl(req) {
  const configured = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return `${req.protocol}://${req.get("host")}`;
}

// Surface the facilitator's rejection reason without logging the buyer's
// one-time PAYMENT-SIGNATURE value.
app.use((req, res, next) => {
  const hasPayment = Boolean(req.get("payment-signature") || req.get("x-payment"));
  if (hasPayment) {
    res.on("finish", () => {
      if (res.statusCode !== 402) return;
      const encoded = res.getHeader("payment-required");
      if (typeof encoded !== "string") return;
      try {
        const requirement = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
        console.error(`x402 paid request rejected: ${requirement.error ?? "unknown error"}`);
      } catch {
        console.error("x402 paid request rejected: unreadable PAYMENT-REQUIRED header");
      }
    });
  }
  next();
});

if (process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET) {
  // CDP Facilitator verifies signatures and settles accepted Base mainnet payments.
  const server = await createX402Server({
    environment: "production",
    payToConfig: { type: "address", evm: PAY_TO },
    routes: {
      "GET /demo": {
        accepts: {
          scheme: "exact",
          network: NETWORK,
          price: PRICE,
          payTo: PAY_TO,
          extra: { assetTransferMethod: "permit2" },
        },
        description: "x402 Agent payment proof of concept",
      },
    },
  });
  app.use(paymentMiddlewareFromHTTPServer(server));
  liveSettlement = true;
} else {
  // Offline preflight: same official x402 middleware emits v2 402 requirements.
  // The unreachable facilitator is never contacted for an unpaid request. Paid
  // requests are intentionally unavailable until CDP credentials are configured.
  const unavailableFacilitator = {
    async getSupported() {
      return {
        kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }],
        extensions: [],
        signers: {},
      };
    },
    async verify() {
      throw new Error("CDP facilitator credentials are required to verify payments");
    },
    async settle() {
      throw new Error("CDP facilitator credentials are required to settle payments");
    },
  };
  const server = new x402ResourceServer(unavailableFacilitator)
    .register(NETWORK, new ExactEvmScheme());
  await server.initialize();
  app.use(paymentMiddleware(routes, server, undefined, undefined, false));
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, settlement: liveSettlement ? "cdp" : "not-configured" });
});

app.get("/", (req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline' https://cdn.jsdelivr.net; font-src https://cdn.jsdelivr.net; script-src 'unsafe-inline'; connect-src https://cdn.jsdelivr.net; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  res.send(renderHomepage({ baseUrl: publicBaseUrl(req), payTo: PAY_TO }));
});

app.get("/demo", (_req, res) => {
  res.json({ message: "Agent가 실제 결제에 성공했습니다!", demo: true });
});

app.listen(PORT, HOST, () => {
  console.log(`x402 demo listening on ${HOST}:${PORT}`);
  console.log(`Settlement ${liveSettlement ? "enabled via CDP Facilitator" : "disabled; configure CDP_API_KEY_ID and CDP_API_KEY_SECRET"}`);
});
