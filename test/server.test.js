import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";

const port = 18402;
const baseUrl = `http://127.0.0.1:${port}`;
let server;

before(async () => {
  server = spawn(process.execPath, ["server.js"], {
    cwd: new URL("..", import.meta.url),
    env: {
      PATH: process.env.PATH,
      PORT: String(port),
      HOST: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("test server did not become ready");
});

after(() => {
  server?.kill("SIGTERM");
});

test("free guide publishes price, API URL, and Permit2 gas warning", async () => {
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /form-action 'none'/);
  assert.match(html, /Agent의 x402 결제/);
  assert.match(html, /0\.01 USDC/);
  assert.match(html, /http:\/\/127\.0\.0\.1:18402\/demo/);
  assert.match(html, /최초 Permit2 승인/);
  assert.match(html, /Bloom Agentic Payments Onchain/);
  assert.match(html, /공식 서비스나 제휴 상품이 아닙니다/);
});

test("guide includes navigable flow, roles, executable commands, and copy controls", async () => {
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();

  for (const id of ["try", "flow", "roles", "code", "concepts", "result", "implications"]) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, new RegExp(`href="#${id}"`));
  }
  for (const id of ["step-a", "step-b", "step-c", "step-d", "step-e", "step-f", "step-g", "step-h", "step-i"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }

  assert.match(html, /<svg class="flow-desktop"/);
  assert.match(html, /class="flow-mobile"/);
  assert.match(html, /baw x402-payment preview --paymentRequirements/);
  assert.match(html, /baw x402-payment sign --paymentId/);
  assert.match(html, /baw wallet tx-history --tx/);
  assert.match(html, /index.*1부터 시작.*selectedIndex/s);
  assert.match(html, /data-copy-target="prompt-connect"/);
  assert.match(html, /data-copy-target="prompt-buy"/);
  assert.match(html, /이전 PoC — 1 USDC/);
  assert.match(html, /현재 0\.01 USDC 상품과 다른 기록/);
  assert.match(html, /현재 상품 · 실제 결제/);
  assert.match(html, /0x9ae8d3430594a0d231efb54680b6767cdb94e4e66ad9a7489e54ac40fc6c4694/);
  assert.match(html, /25\.375221 → 25\.365221 USDC/);
  assert.doesNotMatch(html, /시장을? 수요/);
  assert.doesNotMatch(html, /짧게 정리하면/);
});

test("guide exposes no credential form or live payment secret", async () => {
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();

  assert.doesNotMatch(html, /<input\b/i);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /CDP_API_KEY_SECRET\s*=/);
  assert.doesNotMatch(html, /PAYMENT-SIGNATURE:\s*eyJ/);
  assert.match(html, /개인키, 복구 문구, Binance 로그인 토큰, PAYMENT-SIGNATURE를 입력받지 않습니다/);
});

test("unpaid request returns the exact x402 v2 Permit2 terms", async () => {
  const response = await fetch(`${baseUrl}/demo`);
  assert.equal(response.status, 402);

  const encoded = response.headers.get("payment-required");
  assert.ok(encoded, "PAYMENT-REQUIRED header is missing");
  const challenge = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  const requirement = challenge.accepts[0];

  assert.equal(challenge.x402Version, 2);
  assert.equal(requirement.network, "eip155:8453");
  assert.equal(requirement.asset, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
  assert.equal(requirement.amount, "10000");
  assert.equal(requirement.payTo, "0x711affb5dBc344b7D7BeB54a9870824bc3eB7F5d");
  assert.equal(requirement.scheme, "exact");
  assert.equal(requirement.extra.assetTransferMethod, "permit2");
});
