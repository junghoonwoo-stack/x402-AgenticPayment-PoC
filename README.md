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

---

## 한국어 설명

이 프로젝트는 Coinbase의 공식 x402 SDK와 CDP Facilitator를 사용해 결제 기능을 적용한 독립형 Express API 데모입니다.

- 라이브 데모: https://x402-demo-production-19f3.up.railway.app/
- GitHub 저장소: https://github.com/junghoonwoo-stack/x402-AgenticPayment-PoC

- `GET /`: 가격, API 주소, 에이전트 구매용 프롬프트를 안내하는 무료 한국어 페이지입니다.
- `GET /demo`: Base 메인넷(`eip155:8453`)에서 정확히 `$0.01`, 즉 Base USDC 최소 단위 `10000`을 결제하도록 요구합니다. 판매자 주소는 `0x711affb5dBc344b7D7BeB54a9870824bc3eB7F5d`입니다.
- 결제 검증과 정산이 성공하면 `{"message":"Agent가 실제 결제에 성공했습니다!","demo":true}`를 반환합니다.
- `GET /health`: CDP 정산 자격 증명이 설정되어 있는지 확인합니다.

### 결제 전 402 응답 확인

```sh
npm install
npm start
curl -i http://127.0.0.1:8402/demo
```

Facilitator 자격 증명이 없어도, 결제하지 않은 요청에는 공식 미들웨어가 x402 v2 결제 요구사항을 담은 HTTP 402 응답을 반환합니다. 다만 이 상태에서는 실제 유료 요청을 검증하거나 정산할 수 없습니다.

### Base 메인넷 결제 검증 및 정산 활성화

아래 값을 프로세스 환경변수로 설정하세요. 저장소에는 절대 커밋하지 마세요.

```sh
CDP_API_KEY_ID=<CDP API 키 ID>
CDP_API_KEY_SECRET=<CDP API 키 비밀값>
```

설정 후 서비스를 재시작합니다. 이 키는 서버가 CDP Facilitator에 인증할 때만 사용되며, 판매자 자금을 통제하거나 수령하지 않습니다. 설정된 판매자 주소가 결제 수신 주소이므로 판매자 개인키는 필요하지 않습니다. 기존 `payTo` 주소를 사용하는 경우 `CDP_WALLET_SECRET`도 필요하지 않습니다.

필요하면 `X402_PAY_TO`, `PORT`, `HOST`, `PUBLIC_BASE_URL`을 환경변수로 변경할 수 있습니다. 구매자 지갑 자격 증명은 이 공개 판매자 서버에 저장하면 안 됩니다. 각 구매 에이전트가 자신의 지갑으로 직접 서명합니다. 서버 시작이나 402 사전 확인 과정에서는 구매 또는 송금이 실행되지 않습니다.

Permit2 방식은 최초 한 번의 USDC 승인 트랜잭션을 요구할 수 있습니다. 따라서 구매자는 결제 금액 0.01 USDC 외에 가스비용 Base ETH가 필요할 수 있습니다.
