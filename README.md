# x402 Agentic Payment PoC

A standalone Express API protected with the official Coinbase x402 SDK and CDP Facilitator.

- Live demo: https://x402-demo-production-19f3.up.railway.app/
- Repository: https://github.com/junghoonwoo-stack/x402-AgenticPayment-PoC

- `GET /`: free Korean guide with the price, API URL, and an Agent purchase prompt.
- `GET /demo`: Base mainnet (`eip155:8453`), exact `$0.01` price / atomic amount `10000` (Base USDC), seller `0x711affb5dBc344b7D7BeB54a9870824bc3eB7F5d`.
- On successful verification and settlement, returns `{"message":"Agent가 실제 결제에 성공했습니다!","demo":true}`.
- `GET /health`: reports whether CDP settlement credentials are configured.

## Run the unpaid 402 preflight

```sh
npm install
npm start
curl -i http://127.0.0.1:8402/demo
```

Without facilitator credentials, the official middleware still emits the v2 payment requirements for an unpaid request. Paid requests cannot be verified or settled in this mode.

## Enable Base mainnet verification and settlement

Set these in the process environment (never commit them):

```sh
CDP_API_KEY_ID=<CDP API key ID>
CDP_API_KEY_SECRET=<CDP API key secret>
```

Then restart the service. The key authenticates the server to the CDP Facilitator; it does not control or receive seller funds. The configured seller address is the payment destination and no seller private key is needed. No `CDP_WALLET_SECRET` is required when an existing `payTo` address is used.

`X402_PAY_TO`, `PORT`, `HOST`, and `PUBLIC_BASE_URL` may be overridden. Buyer wallet credentials do not belong on this public seller service: each purchasing Agent signs with its own wallet. No purchase or transfer is performed by this server at startup or by the 402 preflight.

The Permit2 path can require a one-time USDC approval transaction. The buyer may therefore need Base ETH for gas in addition to the 0.01 USDC price.
