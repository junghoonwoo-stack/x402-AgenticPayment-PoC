# x402 Base 메인넷 실결제 테스트 기록

## 0. 현재 0.01 USDC 상품 검증 — 2026-10-04 KST

- 공개 API: `GET https://x402-demo-production-19f3.up.railway.app/demo`
- 결제 조건: Base Mainnet (`eip155:8453`) · USDC · `exact + permit2`
- 결제액: `0.010000 USDC` (`10000` 최소 단위)
- 구매 지갑: `0x06b57dfB4e6dE7344108B10bA1Fc394554c5DAD2`
- 판매 지갑: `0x711affb5dBc344b7D7BeB54a9870824bc3eB7F5d`
- preview: `READY_TO_SIGN`, `needApproveFirst: false`
- 신규 Permit2 승인 거래: 없음
- API 응답: HTTP 200, `PAYMENT-RESPONSE.success: true`
- 응답 본문: `{"message":"Agent가 실제 결제에 성공했습니다!","demo":true}`
- 정산 txHash: `0x9ae8d3430594a0d231efb54680b6767cdb94e4e66ad9a7489e54ac40fc6c4694`
- 블록: `52142027`
- 시각: `2026-10-04 09:23:21 KST`
- receipt status: `1`
- BaseScan: https://basescan.org/tx/0x9ae8d3430594a0d231efb54680b6767cdb94e4e66ad9a7489e54ac40fc6c4694

블록 전후 `balanceOf` 조회와 USDC `Transfer` 로그가 일치했다.

- 구매자: `25.375221 → 25.365221 USDC` (`-0.010000`)
- 판매자: `1.000000 → 1.010000 USDC` (`+0.010000`)
- Transfer: 구매자 → 판매자, `10000`

결제 서명 원문은 출력하거나 파일에 저장하지 않았다. 재호출은 한 번만 실행했다.

- 테스트 일시: 2026-10-03 (KST)
- API: `GET /demo`
- 결제액: `1.000000 USDC`
- 네트워크: Base Mainnet (`eip155:8453`)
- 최종 결과: 성공

> 실제 준비, 실패, 해결 및 온체인 검증을 재현 가능한 형태로 정리했다. 개인키, CDP Secret, 결제 서명 원문은 기록하지 않았다.

## 1. 최종 결론

성공한 흐름은 다음과 같다.

1. API가 HTTP 402로 Base USDC 1달러 결제 조건을 제시한다.
2. Binance Agentic Wallet이 Permit2 방식으로 결제를 준비한다.
3. 구매 지갑에 결제용 **Base USDC**와 최초 Permit2 승인 가스용 **Base ETH**가 있어야 한다.
4. 구매 지갑이 USDC의 Permit2 사용을 승인한다.
5. Agentic Wallet이 결제 서명을 생성하고 API를 다시 호출한다.
6. CDP Facilitator가 검증 후 Base 메인넷에서 정산한다.
7. API가 HTTP 200을 반환하고 판매 지갑에 1 USDC가 입금된다.

처음 사용한 EIP-3009 방식은 서명까지 생성됐지만 CDP 검증/정산에서 `execution reverted`로 거절됐다. 실제 출금은 없었다. Permit2로 변경하고 Base ETH를 충전해 최초 승인을 마친 뒤 결제가 성공했다.

## 2. 필요한 자산

### Base USDC

- 상품 가격을 지불한다.
- 이번 API가 요구한 Base 네이티브 USDC 컨트랙트:
  `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- 다른 네트워크의 USDC는 사용할 수 없다.

### Base ETH

- 성공한 Permit2 경로에서 최초 USDC 승인 트랜잭션의 가스비를 낸다.
- 반드시 **Base 네트워크의 ETH**여야 한다.
- Ethereum 메인넷 ETH는 Base 가스로 사용할 수 없다.
- 0.0025 Base ETH 충전 후 승인 가스로 약 0.000000369335 ETH를 사용했다.

Base ETH는 모든 x402 방식에서 항상 필요한 것은 아니다. EIP-3009는 구매자의 별도 승인 가스 없이 가능한 방식이지만, 이번 Binance Agentic Wallet + CDP 조합에서는 정산이 실패했다. 실제 성공한 Permit2 흐름에는 최초 승인용 Base ETH가 필요했다.

## 3. Binance에서 자금을 준비한 과정

1. Binance Exchange에서 USDC와 ETH를 구매한다.
2. USDC와 ETH를 Binance Wallet/Web3 Wallet 쪽으로 보낸다.
3. Binance 앱 안에서 Wallet의 자산을 Agentic Wallet로 이동한다.
4. Agentic Wallet의 Base 주소에서 최종 잔액을 확인한다.

주의사항:

- USDC와 ETH 모두 전송/출금 네트워크로 `BASE`를 선택한다.
- ETH를 Ethereum 네트워크로 보내면 Base 가스비로 쓸 수 없다.
- USDC를 다른 체인으로 보내면 Base USDC 결제 잔액으로 인식되지 않는다.
- 주소 형식이 같아도 체인별 잔액은 별개다.
- 메뉴명은 앱 버전에 따라 다를 수 있다. 내부 이동처럼 보여도 Agentic Wallet의 Base 잔액이 실제로 증가했는지 확인한다.
- 전송 전 수신 주소, 네트워크와 수수료를 다시 확인한다.

구매 지갑:
`0x06b57dfB4e6dE7344108B10bA1Fc394554c5DAD2`

## 4. 테스트 구성

- 판매 API: `GET /demo`
- 가격: 1 USDC
- 방식: `exact` + `permit2`
- 판매 주소: `0x711affb5dBc344b7D7BeB54a9870824bc3eB7F5d`
- Facilitator: Coinbase CDP
- Permit2: `0x000000000022D473030F116dDEE9F6B43aC78BA3`

`CDP_API_KEY_ID`와 `CDP_API_KEY_SECRET`은 서버가 CDP Facilitator를 인증할 때만 사용한다. 구매/판매 지갑 개인키가 아니며, 서버 로그나 이 문서에는 값을 남기지 않았다.

## 5. 실제 진행 및 실패 기록

### 5.1 처음에는 Base USDC가 없었음

preview 결과가 `ACTION_REQUIRED / INSUFFICIENT_BALANCE`였고 Base USDC 잔액은 0이었다. 이후 구매 지갑에 Base USDC를 충전해 26.375221 USDC를 준비했다.

### 5.2 EIP-3009 서명 후 CDP 정산 거절

preview는 `READY_TO_SIGN`이었고 서명도 생성됐지만 CDP에서 다음 오류가 발생했다.

```text
invalid_payload: contract call failed: unable to call contract: execution reverted
```

- API: HTTP 402 유지
- 정산 txHash: 없음
- USDC 잔액: 26.375221 그대로
- 실제 출금: 없음

즉, preview와 서명 성공은 온체인 정산 성공을 보장하지 않는다. 또한 Agentic Wallet 일일 quota에는 실패한 서명 시도도 포함될 수 있으므로 quota 사용량과 실제 지출은 다를 수 있다.

### 5.3 API 가격을 1 USDC로 변경

x402 `exact` 방식은 서버가 제시한 정확한 금액을 결제해야 한다. 따라서 0.02 USDC 조건에 임의로 1 USDC를 보내지 않고, API 가격을 1 USDC로 바꾼 뒤 새로운 HTTP 402 조건을 받았다.

### 5.4 Permit2 전환 후 Base ETH 부족

Permit2 preview:

- `READY_TO_SIGN`
- 1.000000 USDC
- `needApproveFirst: true`

최초 승인 시 Base ETH가 0이라 다음 오류가 발생했다.

```text
Not enough native token for gas. Please add more, or send a smaller amount to keep some for fees.
```

이 단계에서는 승인이나 결제가 발생하지 않았다.

### 5.5 Base ETH 충전 및 Permit2 승인 성공

구매 지갑에 0.0025 ETH를 Base 네트워크로 충전한 후 USDC가 Permit2에 99.997403 USDC까지 사용하도록 승인했다.

- 승인 txHash: `0x78eb17eb144b07b20c9b3b4b1efa1315bd14a98733ad57f689aba45af5a3ebf8`
- 상태: 성공
- 시각: 2026-10-03 19:06:27 KST
- BaseScan: https://basescan.org/tx/0x78eb17eb144b07b20c9b3b4b1efa1315bd14a98733ad57f689aba45af5a3ebf8

## 6. 1 USDC 결제 성공

승인 확정 후 Permit2 결제 서명을 생성하고 `PAYMENT-SIGNATURE` 헤더로 API를 다시 호출했다.

API 응답:

```json
{"message":"첫 Agent 결제 성공!","demo":true}
```

- HTTP: 200
- `PAYMENT-RESPONSE.success`: true
- 정산 txHash: `0xfee20cbac05359c29cd2fbc3966197d177941bb3045c9b85adeeb6b2f49c1cb5`
- receipt status: 1
- 블록: `0x31b3b6e`
- BaseScan: https://basescan.org/tx/0xfee20cbac05359c29cd2fbc3966197d177941bb3045c9b85adeeb6b2f49c1cb5

## 7. 전체 결제 흐름

```text
GET /demo
  → HTTP 402 + Base USDC 1달러 조건
  → Agentic Wallet preview
  → READY_TO_SIGN / Permit2 / needApproveFirst 확인
  → USDC→Permit2 승인(Base ETH 가스 사용)
  → 승인 트랜잭션 확정
  → Permit2 결제 서명 생성
  → PAYMENT-SIGNATURE와 함께 /demo 재호출
  → CDP 검증 및 Base 정산
  → HTTP 200 + PAYMENT-RESPONSE txHash
  → 구매자 -1 USDC / 판매자 +1 USDC 확인
```

## 8. 잔액 결과

결제 전:

- 구매자 USDC: 26.375221
- 판매자 USDC: 0
- 구매자 Base ETH: 0.0025

승인 및 결제 후:

- 구매자 USDC: 25.375221
- 판매자 USDC: 1.000000
- 구매자 Base ETH: 0.002499630665

변화:

- 구매자: -1 USDC
- 판매자: +1 USDC
- 구매자: 약 -0.000000369335 Base ETH(승인 가스)

## 9. Permit2 승인과 남은 allowance

- 최초 USDC→Permit2 승인: 99.997403 USDC
- 결제 사용: 1.000000 USDC
- 현재 남은 ERC-20 allowance: 98.997403 USDC
- 현재 구매자 USDC 잔액: 25.375221 USDC

allowance가 더 크더라도 실제 사용 가능액은 지갑 잔액으로 제한된다. CDP 정산 대상에 대한 Permit2 내부 개별 allowance는 0으로 확인됐다. 일회성 결제 서명은 사용됐고, 지속해서 남은 권한은 USDC 컨트랙트가 Permit2 컨트랙트에 부여한 ERC-20 allowance다.

승인을 취소하려면 별도 revoke 트랜잭션과 Base ETH 가스가 필요하다. 이번에는 별도 요청이 없어 revoke하지 않았다.

## 10. 성공 판정 기준과 교훈

다음을 모두 확인해야 실결제 성공이다.

- HTTP 402 조건의 네트워크, 토큰, 금액 확인
- 구매 지갑의 Base USDC 및 필요한 Base ETH 확인
- Permit2 승인 tx 성공 확인
- 결제 재요청 HTTP 200 확인
- `PAYMENT-RESPONSE.success = true`
- 정산 txHash 및 receipt status 1 확인
- 구매자 USDC 감소와 판매자 USDC 증가 확인

핵심 교훈:

1. HTTP 402는 결제 조건 생성 성공일 뿐, 정산 성공이 아니다.
2. `/health`의 CDP 활성화도 end-to-end 성공을 보장하지 않는다.
3. preview 성공 후에도 facilitator 검증에서 실패할 수 있다.
4. 실패한 서명 시도와 실제 온체인 지출을 구분한다.
5. Permit2 최초 승인과 실제 결제는 별도 단계다.
6. 결제 서명 원문, CDP Secret, 개인키는 로그에 남기지 않는다.

## 11. 재현 절차

1. `/health`에서 CDP 정산 모드 확인
2. `/demo` 미결제 호출로 새 HTTP 402 조건 수신
3. Base / USDC / 1 USDC / Permit2 조건 확인
4. Agentic Wallet의 Base USDC와 Base ETH 잔액 확인
5. preview 실행
6. `needApproveFirst`면 승인하고 tx 확정 대기
7. 새 결제 서명 생성
8. 서명과 함께 `/demo` 재호출
9. HTTP 200과 `PAYMENT-RESPONSE` txHash 확인
10. receipt 및 구매자/판매자 잔액 확인

## 12. 온체인 증빙

- Permit2 승인: https://basescan.org/tx/0x78eb17eb144b07b20c9b3b4b1efa1315bd14a98733ad57f689aba45af5a3ebf8
- 1 USDC 결제: https://basescan.org/tx/0xfee20cbac05359c29cd2fbc3966197d177941bb3045c9b85adeeb6b2f49c1cb5
