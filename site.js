const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NETWORK = "eip155:8453";
const AMOUNT = "10000";
const VERIFIED_TX = "0x9ae8d3430594a0d231efb54680b6767cdb94e4e66ad9a7489e54ac40fc6c4694";
const VERIFIED_BUYER = "0x06b57dfB4e6dE7344108B10bA1Fc394554c5DAD2";
const VERIFIED_AT = "2026-10-04 09:23 KST";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function codeBlock(id, label, content, language = "") {
  return `
    <div class="code-shell">
      <div class="code-head"><span>${escapeHtml(label)}</span><button class="copy-button" type="button" data-copy-target="${id}">복사</button></div>
      <pre><code id="${id}" class="${escapeHtml(language)}">${escapeHtml(content)}</code></pre>
    </div>`;
}

function stageCard({ id, eyebrow, title, route, purpose, money, body }) {
  return `
    <article class="stage-card" id="${id}">
      <div class="stage-number">${eyebrow}</div>
      <div class="stage-main">
        <h3>${title}</h3>
        <dl class="stage-meta">
          <div><dt>보내는 방향</dt><dd>${route}</dd></div>
          <div><dt>목적</dt><dd>${purpose}</dd></div>
          <div><dt>돈의 이동</dt><dd>${money}</dd></div>
        </dl>
        ${body}
      </div>
    </article>`;
}

export function renderHomepage({ baseUrl, payTo }) {
  const safeBaseUrl = escapeHtml(baseUrl);
  const apiUrl = `${baseUrl}/demo`;
  const connectPrompt = `Binance Agentic Wallet 공식 스킬을 설치하고 지갑 연결만 진행해줘.

npx skills add binance/binance-skills-hub/skills/binance-web3/binance-agentic-wallet

로그인 링크 또는 QR을 받아 Binance 앱에서 승인해. 연결 후 Base(chain ID 8453) 주소와 Base USDC·Base ETH 잔액을 읽기 전용으로 보여줘. 이 연결 단계에서는 송금, 교환, 승인, 서명, 결제를 실행하지 마. 개인키·복구 문구·로그인 토큰을 요구하거나 출력하지 마.`;
  const purchasePrompt = `다음 x402 API를 Base USDC 0.01로 정확히 한 번만 구매해줘: ${apiUrl}

1) 먼저 미결제 GET으로 HTTP 402 조건을 받고 x402 v2, eip155:8453, Base USDC ${USDC_ADDRESS}, amount 10000, payTo ${payTo}, exact + Permit2인지 검증해.
2) Binance Agentic Wallet로 preview하고 paymentId, 1-based index, amount, payTo, currentBalance, assetTransferMethod, needApproveFirst를 보여줘.
3) 결제 서명 전에 내 확인을 받아. needApproveFirst가 true면 신규 승인 금액과 예상 Base ETH 가스 조건을 먼저 설명해.
4) 승인이 전송되면 approveTxHash 확정을 확인한 뒤에만 결제 헤더로 원래 요청을 한 번 재호출해.
5) 정산 상태가 불명확하거나 재요청이 실패하면 새 서명으로 자동 재결제하지 마.
6) 완료하면 HTTP 상태, 받은 JSON, 실제 결제액, 정산 거래 해시, BaseScan 링크, 승인 거래가 있었다면 그 별도 해시를 보고해. PAYMENT-SIGNATURE 원문은 출력하거나 저장하지 마.`;

  const requiredJson = JSON.stringify({
    x402Version: 2,
    error: "Payment required",
    resource: {
      url: apiUrl,
      description: "x402 Agent payment proof of concept",
      mimeType: "",
    },
    accepts: [{
      scheme: "exact",
      network: NETWORK,
      amount: AMOUNT,
      asset: USDC_ADDRESS,
      payTo,
      maxTimeoutSeconds: 300,
      extra: { name: "USD Coin", version: "2", assetTransferMethod: "permit2" },
    }],
    extensions: { "…": "현재 응답에는 가스 후원·Bazaar·builder-code 메타데이터도 포함" },
  }, null, 2);

  const previewExample = JSON.stringify({
    success: true,
    data: {
      paymentId: "<preview가 반환한 paymentId>",
      options: [{
        index: 1,
        status: "READY_TO_SIGN",
        scheme: "exact",
        assetTransferMethod: "permit2",
        binanceChainId: "8453",
        tokenAddress: USDC_ADDRESS,
        tokenSymbol: "USDC",
        amount: "0.01",
        payTo,
        userWalletAddress: "<구매 지갑 Base 주소>",
        currentBalance: "<조회 시점 잔액>",
        needApproveFirst: true,
      }],
    },
  }, null, 2);

  const signExample = JSON.stringify({
    success: true,
    data: {
      paymentHeaderName: "PAYMENT-SIGNATURE",
      paymentHeaderValue: "<공개하거나 로그에 남기지 않는 일회성 값>",
      approveTxHash: "<승인이 필요하면 거래 해시, 아니면 null>",
      binanceChainId: "8453",
      signatureExpiresAt: "<UTC epoch seconds>",
    },
  }, null, 2);

  const facilitatorBody = JSON.stringify({
    x402Version: 2,
    paymentPayload: "<구매자가 PAYMENT-SIGNATURE로 보낸 서명 데이터>",
    paymentRequirements: {
      scheme: "exact",
      network: NETWORK,
      asset: USDC_ADDRESS,
      amount: AMOUNT,
      payTo,
      maxTimeoutSeconds: 300,
      extra: { assetTransferMethod: "permit2" },
    },
  }, null, 2);

  const settlementExample = JSON.stringify({
    success: true,
    payer: "<검증된 구매 지갑 주소>",
    transaction: "0x<정산 거래 해시>",
    network: NETWORK,
  }, null, 2);

  const finalBody = JSON.stringify({ message: "Agent가 실제 결제에 성공했습니다!", demo: true }, null, 2);

  const stages = [
    stageCard({
      id: "step-a",
      eyebrow: "A",
      title: "최초 요청",
      route: "구매 Agent → 판매 API",
      purpose: "보호된 리소스를 평범한 HTTP GET으로 요청합니다.",
      money: "없음",
      body: `${codeBlock("code-first-request", "실행 가능 · 현재 공개 API", `curl -i ${apiUrl}`)}<p class="aside">일반 <code>curl</code>은 요청과 헤더 전송 도구일 뿐, 지갑 연결·preview·서명·자동 결제를 해주지 않습니다.</p>`,
    }),
    stageCard({
      id: "step-b",
      eyebrow: "B",
      title: "HTTP 402와 결제 조건",
      route: "판매 API → 구매 Agent",
      purpose: "가격·체인·토큰·수령 주소·방식을 표준 형식으로 제시합니다.",
      money: "없음 · 402는 청구서이지 영수증이 아닙니다",
      body: `${codeBlock("code-required-header", "실제 응답 형태", `HTTP/2 402\nPAYMENT-REQUIRED: <Base64로 인코딩된 x402 v2 JSON>\ncontent-type: application/json`)}<details><summary>현재 PAYMENT-REQUIRED 디코딩 JSON 보기</summary>${codeBlock("json-payment-required", "2026-10-04 KST 배포 기준", requiredJson, "json")}</details>`,
    }),
    stageCard({
      id: "step-c",
      eyebrow: "C",
      title: "결제 preview",
      route: "구매 Agent → Binance Agentic Wallet",
      purpose: "지갑이 조건·잔액·정책·승인 필요 여부를 서명 전에 점검합니다.",
      money: "없음",
      body: `${codeBlock("code-preview", "실행 가능 · 공식 CLI", `baw x402-payment preview --paymentRequirements '<PAYMENT-REQUIRED 값 또는 디코딩 JSON>' --json`)}<details open><summary>응답 필드 예시 보기</summary>${codeBlock("json-preview", "설명용 예시 · 실제 값은 실행 시 달라짐", previewExample, "json")}</details><p class="aside"><code>index</code>는 0이 아니라 <strong>1부터 시작</strong>하며, 서명할 때 preview가 반환한 값을 그대로 <code>selectedIndex</code>에 넣습니다. <code>READY_TO_SIGN</code>은 서명 가능 상태이지 입금 완료가 아닙니다.</p>`,
    }),
    stageCard({
      id: "step-d",
      eyebrow: "D",
      title: "최초 Permit2 승인 — 필요할 때만",
      route: "구매 지갑 → Base의 USDC 컨트랙트",
      purpose: "USDC가 Permit2 컨트랙트에 토큰을 사용할 수 있는 ERC-20 allowance를 부여합니다.",
      money: "상품대금은 아직 이동하지 않음 · 승인 거래 가스용 Base ETH는 소모될 수 있음",
      body: `<p>Binance x402 흐름에는 별도의 추정 승인 명령을 만들지 않습니다. 다음 단계의 <code>x402-payment sign</code>이 필요 시 승인 거래를 함께 전송하고 <code>approveTxHash</code>를 돌려줍니다.</p>${codeBlock("code-approval-check", "실행 가능 · 승인 거래가 반환된 경우", `baw wallet tx-history --tx <approveTxHash> --json`)}<div class="callout warning"><strong>두 거래를 구분하세요.</strong> 승인 해시는 “USDC → Permit2 권한 설정”, 정산 해시는 “구매자 → 판매자 0.01 USDC 이동”입니다. 서로 다를 수 있습니다.</div>`,
    }),
    stageCard({
      id: "step-e",
      eyebrow: "E",
      title: "결제 서명",
      route: "구매 Agent → 구매 지갑",
      purpose: "preview에서 선택한 정확한 조건에 대한 일회성 암호학적 허가를 만듭니다.",
      money: "서명만으로 상품대금 이동은 확정되지 않음 · 필요 시 승인 거래는 전송될 수 있음",
      body: `${codeBlock("code-sign", "실행 가능 · 사용자 확인 후", `baw x402-payment sign --paymentId <paymentId> --selectedIndex 1 --json`)}<details open><summary>서명 응답 예시 보기</summary>${codeBlock("json-sign", "설명용 예시", signExample, "json")}</details><p class="aside">서명은 잔액 보장·입금 완료·사람의 직접 확인을 뜻하지 않습니다. <code>paymentHeaderValue</code>는 일회성이며 페이지·로그·문서에 공개하지 않습니다.</p>`,
    }),
    stageCard({
      id: "step-f",
      eyebrow: "F",
      title: "서명을 붙여 API 재호출",
      route: "구매 Agent → 판매 API",
      purpose: "원래 요청에 지갑이 반환한 헤더 이름과 값을 그대로 붙입니다.",
      money: "서버가 검증·정산에 성공하면 이 요청 중 0.01 USDC 이동",
      body: `${codeBlock("code-replay", "실행 가능 · 실제 서명은 절대 페이지에 입력하지 않음", `curl -i \\\n  -H 'PAYMENT-SIGNATURE: <paymentHeaderValue>' \\\n  ${apiUrl}`)}<p class="aside"><code>approveTxHash</code>가 있으면 먼저 확정을 기다립니다. 정산 상태가 불명확하면 같은 서명을 반복하거나 새 서명으로 자동 재결제하지 않습니다.</p>`,
    }),
    stageCard({
      id: "step-g",
      eyebrow: "G",
      title: "판매 서버 → Facilitator",
      route: "판매 API → Coinbase CDP Facilitator",
      purpose: "구매자 서명을 검증하고, 서버가 정한 조건으로 정산을 요청합니다.",
      money: "verify 단계는 없음 · settle 성공 시 온체인 이동",
      body: `<div class="split-note"><div><span class="tag">현재 실행 코드</span><p><code>createX402Server({ environment: "production", payToConfig, routes })</code>와 <code>paymentMiddlewareFromHTTPServer</code>가 JWT 생성과 verify/settle 통신을 처리합니다.</p></div><div><span class="tag">직접 REST 연동 시</span><p><code>POST /platform/v2/x402/verify</code> 후 <code>POST /platform/v2/x402/settle</code>에 같은 구조를 보냅니다.</p></div></div><details><summary>/verify · /settle 요청 구조 보기</summary>${codeBlock("json-facilitator-body", "설명용 구조 · 서명/JWT는 가림", facilitatorBody, "json")}${codeBlock("code-jwt", "공식 SDK 방식 · 의사코드", `import { generateJwt } from "@coinbase/cdp-sdk/auth";\n\nconst jwt = await generateJwt({\n  apiKeyId: process.env.CDP_API_KEY_ID,\n  apiKeySecret: process.env.CDP_API_KEY_SECRET,\n  requestMethod: "POST",\n  requestHost: "api.cdp.coinbase.com",\n  requestPath: "/platform/v2/x402/verify",\n  expiresIn: 120\n});`)}</details><div class="callout"><strong>서로 다른 두 인증:</strong> 구매 지갑 서명은 0.01 USDC 결제 허가이고, 판매 서버의 CDP JWT는 CDP API 호출 인증입니다. 서버는 구매자가 보낸 가격을 신뢰하지 않고 자기 <code>paymentRequirements</code>와 대조합니다.</div>`,
    }),
    stageCard({
      id: "step-h",
      eyebrow: "H",
      title: "정산 결과",
      route: "Facilitator ↔ Base 블록체인 → 판매 API",
      purpose: "거래를 제출하고 체인 결과와 정산 거래 해시를 돌려줍니다.",
      money: "성공하면 0.01 USDC가 구매자에서 판매자 주소로 이동",
      body: `${codeBlock("json-settlement", "공식 SettlementResponse 형식에 맞춘 예시", settlementExample, "json")}<p class="aside">Facilitator는 구매대금을 자기 자금으로 대신 내는 주체가 아닙니다. 검증·제출·결과 확인을 맡으며 직접 구현도 가능합니다.</p>`,
    }),
    stageCard({
      id: "step-i",
      eyebrow: "I",
      title: "최종 데이터와 결제 영수증",
      route: "판매 API → 구매 Agent",
      purpose: "유료 데이터를 반환하고 PAYMENT-RESPONSE로 정산 메타데이터를 전달합니다.",
      money: "정산 성공 상태",
      body: `${codeBlock("code-final", "현재 API 성공 본문", `HTTP/2 200\nPAYMENT-RESPONSE: <Base64 정산 결과>\ncontent-type: application/json\n\n${finalBody}`)}<p class="aside">HTTP 200, 지갑 서명 성공, Facilitator 정산 성공은 서로 다른 상태입니다. 실제 성공 판정은 200 + PAYMENT-RESPONSE + 온체인 receipt + 예상 금액 이동을 함께 확인합니다.</p>`,
    }),
  ].join("");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Base 메인넷에서 0.01 USDC로 체험하는 실제 x402 Agentic Payment 데모">
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" crossorigin>
  <title>x402 결제 데모 · Base USDC</title>
  <style>
    :root{--ivory:#f6f1e8;--paper:#fffdf8;--ink:#292724;--muted:#6f6a64;--soft:#e9e0d4;--line:#d8ccbe;--terra:#b65f43;--terra-dark:#7f3f2e;--terra-soft:#f1ddd3;--sage:#667568;--sage-soft:#e2e8df;--gold:#a9772d;--shadow:0 14px 50px rgba(64,45,34,.07);--radius:20px;--sans:"Pretendard Variable",Pretendard,"SUIT Variable",SUIT,"Noto Sans KR","Apple SD Gothic Neo",Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--mono:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;scroll-behavior:smooth;color-scheme:light}
    body{overflow-x:clip}
    *{box-sizing:border-box}html{scroll-padding-top:92px}body{margin:0;background:var(--ivory);color:var(--ink);font:16px/1.78 var(--sans);font-kerning:normal;text-rendering:optimizeLegibility;word-break:keep-all}a{color:var(--terra-dark);text-underline-offset:3px}button,a{touch-action:manipulation}code{font-family:var(--mono);font-size:.9em;word-break:break-all}.site-nav{position:sticky;top:0;z-index:20;border-bottom:1px solid rgba(127,63,46,.14);background:rgba(246,241,232,.94);backdrop-filter:blur(14px)}.nav-inner{max-width:1180px;margin:auto;padding:12px 22px;display:flex;gap:20px;align-items:center;min-width:0}.brand{font:750 16px/1.2 var(--sans);letter-spacing:-.02em;white-space:nowrap;color:var(--ink);text-decoration:none}.brand-dot{color:var(--terra)}.toc{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;min-width:0}.toc::-webkit-scrollbar{display:none}.toc a{white-space:nowrap;text-decoration:none;color:var(--muted);font-size:13px;padding:7px 10px;border-radius:999px}.toc a:hover,.toc a:focus-visible{color:var(--terra-dark);background:var(--terra-soft);outline:none}.wrap{max-width:1120px;margin:auto;padding:0 24px;min-width:0}.hero{padding:100px 0 84px;border-bottom:1px solid var(--line)}.hero-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:72px;align-items:end}.kicker,.section-kicker{color:var(--terra-dark);font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.hero h1{font:720 clamp(3rem,6.2vw,5.5rem)/1.1 var(--sans);letter-spacing:-.035em;margin:16px 0 24px;max-width:900px}.hero-lead{font-size:clamp(1.08rem,2vw,1.3rem);line-height:1.65;letter-spacing:-.012em;max-width:720px;color:#4d4944;margin:0 0 32px}.actions{display:flex;gap:12px;flex-wrap:wrap}.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border:1px solid var(--terra);border-radius:999px;background:var(--terra);color:white;text-decoration:none;font-weight:750}.button.secondary{background:transparent;color:var(--terra-dark)}.button:hover{transform:translateY(-1px)}.price-card{background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);padding:28px;box-shadow:var(--shadow)}.price{font:720 2.4rem/1.15 var(--sans);letter-spacing:-.03em;margin:10px 0 5px}.price-sub{color:var(--muted);margin:0}.mainnet-note{margin-top:22px;padding-top:20px;border-top:1px solid var(--line);font-size:14px;color:#514b45}.event-note{margin-top:18px;color:var(--muted);font-size:13px}.section{padding:92px 0;border-bottom:1px solid var(--line)}.section-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.48fr);gap:48px;align-items:end;margin-bottom:42px}.section h2{font:720 clamp(2.1rem,3.6vw,3.35rem)/1.18 var(--sans);letter-spacing:-.028em;margin:10px 0 0}.section-intro{color:var(--muted);margin:0;max-width:560px}.flow-frame{background:var(--paper);border:1px solid var(--line);border-radius:24px;padding:26px;box-shadow:var(--shadow);overflow:hidden}.flow-desktop{display:block;width:100%;height:auto}.flow-mobile{display:none}.lane{stroke:#d8ccbe;stroke-width:1;stroke-dasharray:4 6}.flow-arrow{stroke:var(--terra);stroke-width:2;fill:none;marker-end:url(#arrow)}.flow-arrow.return{stroke:var(--sage);marker-end:url(#arrow-sage)}.flow-arrow.approval{stroke:var(--gold);stroke-dasharray:7 5;marker-end:url(#arrow-gold)}.flow-node{fill:#fffdf8;stroke:#cdbdaf;stroke-width:1.5}.flow-node.wallet{fill:var(--terra-soft)}.flow-node.chain{fill:var(--sage-soft)}.flow-text{fill:var(--ink);font:700 14px var(--sans)}.flow-small{fill:var(--muted);font:12px var(--sans)}.flow-step text{fill:var(--ink);font:700 12px var(--sans)}.flow-step:hover text,.flow-step:focus text{fill:var(--terra-dark)}.flow-note{margin:18px 0 0;color:var(--muted);font-size:14px}.legend{display:flex;gap:18px;flex-wrap:wrap;margin-top:18px;font-size:13px;color:var(--muted)}.legend span::before{content:"";display:inline-block;width:26px;border-top:2px solid var(--terra);margin-right:8px;vertical-align:middle}.legend .approval-key::before{border-color:var(--gold);border-top-style:dashed}.table-wrap{overflow-x:auto;max-width:100%;border:1px solid var(--line);border-radius:18px;background:var(--paper)}table{width:100%;border-collapse:collapse;min-width:820px}th,td{padding:18px 20px;text-align:left;vertical-align:top;border-bottom:1px solid var(--soft)}th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);background:#fbf7f0}td:first-child{font-weight:800;width:150px}tr:last-child td{border-bottom:0}.agent-grid,.insight-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.agent-card,.insight-card{padding:24px;border:1px solid var(--line);border-radius:18px;background:rgba(255,253,248,.6);min-width:0;overflow-wrap:anywhere}.agent-card h3,.insight-card h3{margin:0 0 8px;font-size:18px;line-height:1.45}.agent-card p,.insight-card p{margin:0;color:var(--muted)}.verified{display:inline-flex;margin-top:16px;padding:4px 9px;border-radius:999px;background:var(--sage-soft);color:#405345;font-size:12px;font-weight:800}.common-kit{margin-top:24px;padding:28px;border-left:3px solid var(--terra);background:var(--paper)}.common-kit ul{columns:2;gap:44px;margin-bottom:0}.stages{display:grid;gap:18px}.stage-card{display:grid;grid-template-columns:58px 1fr;gap:20px;background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:26px;scroll-margin-top:96px}.stage-main{min-width:0;overflow-wrap:anywhere}.stage-number{width:46px;height:46px;display:grid;place-items:center;border:1px solid var(--terra);border-radius:50%;color:var(--terra-dark);font:800 18px/1 var(--sans)}.stage-main h3{font:720 1.45rem/1.4 var(--sans);letter-spacing:-.015em;margin:4px 0 14px}.stage-meta{display:grid;grid-template-columns:1fr 1.2fr 1.2fr;gap:10px;margin:0 0 20px}.stage-meta div{border-top:1px solid var(--soft);padding-top:10px}.stage-meta dt{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.stage-meta dd{margin:2px 0 0;font-size:14px}.code-shell{margin:16px 0;border:1px solid #cfc4b7;border-radius:14px;overflow:hidden;background:#282623;color:#f8f1e7}.code-head{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-bottom:1px solid #46413c;color:#cfc6bb;font-size:12px}.copy-button{border:1px solid #6a6259;background:transparent;color:#f8f1e7;border-radius:999px;padding:5px 10px;font:700 11px var(--sans);cursor:pointer}.copy-button:hover,.copy-button:focus-visible{background:#fff2;outline:none}.code-shell pre{margin:0;padding:18px;overflow:auto;font:13px/1.7 var(--mono);white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal}.code-shell code{font:inherit}.aside{font-size:14px;color:var(--muted)}details{border-top:1px solid var(--soft);margin-top:18px;padding-top:14px}summary{cursor:pointer;font-weight:750;color:var(--terra-dark)}.callout{padding:16px 18px;border-radius:12px;background:var(--sage-soft);font-size:14px;margin-top:16px}.callout.warning{background:#f5e8cf}.split-note{display:grid;grid-template-columns:1fr 1fr;gap:12px}.split-note>div{padding:16px;border:1px solid var(--soft);border-radius:12px;min-width:0}.split-note p{font-size:14px;margin:8px 0 0;color:var(--muted)}.tag{font-size:11px;font-weight:850;color:var(--terra-dark);letter-spacing:.06em;text-transform:uppercase}.qa-list{display:grid;gap:10px}.qa-list details{margin:0;padding:0;border:1px solid var(--line);border-radius:14px;background:var(--paper)}.qa-list summary{padding:18px 20px;color:var(--ink);list-style:none}.qa-list summary::-webkit-details-marker{display:none}.qa-list summary::after{content:"＋";float:right;color:var(--terra)}.qa-list details[open] summary::after{content:"−"}.qa-answer{padding:0 20px 20px;color:var(--muted);overflow-wrap:anywhere}.qa-answer p:first-child{margin-top:0}.mini-table{width:100%;min-width:0;margin:14px 0;border:1px solid var(--line)}.mini-table th,.mini-table td{padding:10px 12px;font-size:13px}.try-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.prompt-card{background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:24px;min-width:0}.prompt-card h3{font:720 1.3rem/1.4 var(--sans);letter-spacing:-.015em;margin:0}.prompt-card>p{color:var(--muted);font-size:14px}.privacy-note{margin-top:22px;text-align:center;color:var(--terra-dark);font-weight:750}.result-demo{display:grid;grid-template-columns:1.15fr .85fr;gap:20px}.receipt{background:#2b2926;color:#f9f2e8;border-radius:22px;padding:28px;min-width:0}.receipt-label{color:#c9bfb4;font-size:12px;text-transform:uppercase;letter-spacing:.1em}.receipt-price{font:720 2.3rem/1.2 var(--sans);letter-spacing:-.025em;margin:10px 0}.receipt-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:24px}.receipt-grid div{border-top:1px solid #554f49;padding-top:10px;min-width:0}.receipt-grid span{display:block;color:#c9bfb4;font-size:12px}.receipt-grid strong{font-size:14px;overflow-wrap:anywhere}.receipt a{color:#f4c9b9}.historic{border:1px solid var(--line);border-radius:22px;padding:26px;background:var(--paper);min-width:0}.historic h3{font:720 1.3rem/1.4 var(--sans);letter-spacing:-.015em;margin:0 0 10px}.historic p{color:var(--muted);font-size:14px}.status-list{display:grid;gap:8px;margin-top:18px}.status-row{display:flex;justify-content:space-between;gap:18px;border-top:1px solid var(--soft);padding-top:9px;font-size:14px}.status-row>*:last-child{text-align:right;overflow-wrap:anywhere}.source-list{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:30px}.source-list a{padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:rgba(255,253,248,.55);text-decoration:none;min-width:0;overflow-wrap:anywhere}.footer{padding:50px 24px 72px;text-align:center;color:var(--muted);font-size:13px;overflow-wrap:anywhere}.copy-status{position:fixed;right:18px;bottom:18px;background:#282623;color:white;padding:10px 14px;border-radius:999px;font-size:13px;opacity:0;transform:translateY(8px);transition:.2s;pointer-events:none;z-index:30}.copy-status.show{opacity:1;transform:translateY(0)}
    @media (max-width:820px){.nav-inner{padding:10px 16px}.brand{font-size:15px}.hero{padding:68px 0 62px}.hero-grid,.section-head,.result-demo{grid-template-columns:1fr;gap:32px}.hero h1{font-size:clamp(2.75rem,13vw,4.4rem);line-height:1.13}.section{padding:68px 0}.section h2{line-height:1.22}.flow-desktop{display:none}.flow-mobile{display:grid;gap:10px}.flow-mobile a{display:grid;grid-template-columns:34px 1fr;gap:12px;align-items:center;padding:13px;border:1px solid var(--soft);border-radius:12px;text-decoration:none;background:#fff}.flow-mobile b{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--terra-soft);color:var(--terra-dark)}.flow-mobile span{color:var(--ink);font-size:14px}.agent-grid,.insight-grid,.try-grid,.source-list{grid-template-columns:1fr}.common-kit ul{columns:1}.stage-meta,.split-note{grid-template-columns:1fr}.stage-card{grid-template-columns:1fr;padding:21px}.stage-number{width:38px;height:38px}.receipt-grid{grid-template-columns:1fr}.wrap{padding:0 18px}.price-card{padding:22px}.status-row{align-items:flex-start}}
    @media (prefers-reduced-motion:reduce){:root{scroll-behavior:auto}.button:hover{transform:none}}
  </style>
</head>
<body>
  <nav class="site-nav" aria-label="페이지 목차">
    <div class="nav-inner"><a class="brand" href="#top">x402<span class="brand-dot">.</span>payment demo</a><div class="toc">
      <a href="#try">체험하기</a><a href="#flow">전체 흐름</a><a href="#roles">역할과 준비물</a><a href="#code">코드로 이해하기</a><a href="#concepts">핵심 개념</a><a href="#result">성공 결과</a><a href="#implications">시사점</a>
    </div></div>
  </nav>
  <main id="top">
    <header class="hero"><div class="wrap hero-grid">
      <div><p class="kicker">x402 payment demo</p><h1>Agent의 x402 결제</h1><p class="hero-lead">Base 메인넷에서 API 요청, 지갑 서명, 0.01 USDC 정산을 확인하는 데모.</p><div class="actions"><a class="button" href="#try">결제 체험</a><a class="button secondary" href="#flow">결제 흐름</a></div><p class="event-note"><a href="https://luma.com/mw84pfjm" target="_blank" rel="noreferrer">Bloom Agentic Payments Onchain</a> 행사 이후 개인적으로 구현했습니다. Bloom 공식 서비스나 제휴 상품이 아닙니다.</p></div>
      <aside class="price-card" aria-label="가격과 주의사항"><span class="section-kicker">Live on Base</span><div class="price">0.01 USDC</div><p class="price-sub">1회 · atomic amount ${AMOUNT}</p><div class="mainnet-note"><strong>실제 Base 메인넷 결제입니다.</strong><br>최초 Permit2 승인에는 상품 가격 외 가스비가 발생할 수 있습니다.</div></aside>
    </div></header>

    <section class="section" id="flow"><div class="wrap"><div class="section-head"><div><span class="section-kicker">01 · 전체 흐름</span><h2>x402 결제 흐름</h2></div><p class="section-intro">첫 요청은 결제 조건을 받습니다. 두 번째 요청은 지갑 서명을 포함합니다. 단계 선택 시 관련 명령으로 이동합니다.</p></div>
      <div class="flow-frame">
        <svg class="flow-desktop" viewBox="0 0 1200 650" role="img" aria-labelledby="flow-title flow-desc">
          <title id="flow-title">x402 결제 5개 참여자와 10단계 흐름</title><desc id="flow-desc">구매 Agent, 구매 지갑, 판매 API, Facilitator, Base 블록체인 사이의 요청, 서명, 검증, 정산 순서</desc>
          <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#b65f43"/></marker><marker id="arrow-sage" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#667568"/></marker><marker id="arrow-gold" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#a9772d"/></marker></defs>
          <line class="lane" x1="120" y1="92" x2="120" y2="610"/><line class="lane" x1="360" y1="92" x2="360" y2="610"/><line class="lane" x1="600" y1="92" x2="600" y2="610"/><line class="lane" x1="840" y1="92" x2="840" y2="610"/><line class="lane" x1="1080" y1="92" x2="1080" y2="610"/>
          <a class="flow-step" href="#step-a"><path class="flow-arrow" d="M120 142 H600"/><text x="330" y="133">① 데이터 요청</text></a>
          <a class="flow-step" href="#step-b"><path class="flow-arrow return" d="M600 184 H120"/><text x="292" y="175">② HTTP 402 + 조건</text></a>
          <a class="flow-step" href="#step-c"><path class="flow-arrow" d="M120 226 H360"/><text x="174" y="217">③ preview · 서명 요청</text></a>
          <a class="flow-step" href="#step-e"><path class="flow-arrow return" d="M360 268 H120"/><text x="178" y="259">④ 서명 데이터</text></a>
          <a class="flow-step" href="#step-f"><path class="flow-arrow" d="M120 310 H600"/><text x="290" y="301">⑤ 서명 붙여 재요청</text></a>
          <a class="flow-step" href="#step-g"><path class="flow-arrow" d="M600 352 H840"/><text x="650" y="343">⑥ 검증·정산 요청</text></a>
          <a class="flow-step" href="#step-h"><path class="flow-arrow" d="M840 394 H1080"/><text x="902" y="385">⑦ 거래 제출</text></a>
          <a class="flow-step" href="#step-h"><path class="flow-arrow return" d="M1080 436 H840"/><text x="900" y="427">⑧ 거래 결과</text></a>
          <a class="flow-step" href="#step-h"><path class="flow-arrow return" d="M840 478 H600"/><text x="636" y="469">⑨ 정산 결과 · txHash</text></a>
          <a class="flow-step" href="#step-i"><path class="flow-arrow return" d="M600 520 H120"/><text x="278" y="511">⑩ 데이터 · 영수증</text></a>
          <a class="flow-step" href="#step-d"><path class="flow-arrow approval" d="M360 570 H1080"/><text x="620" y="561">필요 시 최초 Permit2 승인 · 상품대금 송금과 별도</text></a>
          <rect class="flow-node" x="24" y="24" width="192" height="68" rx="16"/><rect class="flow-node wallet" x="264" y="24" width="192" height="68" rx="16"/><rect class="flow-node" x="504" y="24" width="192" height="68" rx="16"/><rect class="flow-node" x="744" y="24" width="192" height="68" rx="16"/><rect class="flow-node chain" x="984" y="24" width="192" height="68" rx="16"/>
          <text class="flow-text" x="120" y="52" text-anchor="middle">구매 Agent</text><text class="flow-small" x="120" y="73" text-anchor="middle">판단 · 오케스트레이션</text><text class="flow-text" x="360" y="52" text-anchor="middle">구매 지갑</text><text class="flow-small" x="360" y="73" text-anchor="middle">승인 · 서명</text><text class="flow-text" x="600" y="52" text-anchor="middle">판매 API</text><text class="flow-small" x="600" y="73" text-anchor="middle">가격 · 데이터</text><text class="flow-text" x="840" y="52" text-anchor="middle">Facilitator</text><text class="flow-small" x="840" y="73" text-anchor="middle">검증 · 제출</text><text class="flow-text" x="1080" y="52" text-anchor="middle">Base 블록체인</text><text class="flow-small" x="1080" y="73" text-anchor="middle">USDC 이동 · 기록</text>
        </svg>
        <div class="flow-mobile" aria-label="모바일 결제 흐름">
          <a href="#step-a"><b>1</b><span>Agent → API · 데이터 요청</span></a><a href="#step-b"><b>2</b><span>API → Agent · HTTP 402와 결제 조건</span></a><a href="#step-c"><b>3</b><span>Agent → 지갑 · preview와 서명 요청</span></a><a href="#step-e"><b>4</b><span>지갑 → Agent · 서명된 결제 데이터</span></a><a href="#step-f"><b>5</b><span>Agent → API · 서명을 붙여 재요청</span></a><a href="#step-g"><b>6</b><span>API → Facilitator · 검증·정산 요청</span></a><a href="#step-h"><b>7</b><span>Facilitator → Base · 거래 제출</span></a><a href="#step-h"><b>8</b><span>Base → Facilitator · 거래 결과</span></a><a href="#step-h"><b>9</b><span>Facilitator → API · 정산 결과·해시</span></a><a href="#step-i"><b>10</b><span>API → Agent · 데이터·영수증</span></a><a href="#step-d"><b>+</b><span>필요 시 Permit2 최초 승인 · 구매대금과 별도</span></a>
        </div>
        <div class="legend"><span>구매·정산 기본 흐름</span><span class="approval-key">조건부 Permit2 승인 흐름</span></div><p class="flow-note">이 그림은 현재 데모의 <code>exact + Permit2 + CDP</code> 실행 경로입니다. 모든 x402 방식이 같은 정산 순서를 강제하는 것은 아닙니다.</p>
      </div>
    </div></section>

    <section class="section" id="roles"><div class="wrap"><div class="section-head"><div><span class="section-kicker">02 · 역할과 준비물</span><h2>참여자와 준비 사항</h2></div><p class="section-intro">Agent, 지갑, 판매 API, Facilitator, Base의 역할을 구분합니다.</p></div>
      <div class="table-wrap"><table><thead><tr><th>참여자</th><th>역할</th><th>준비물</th><th>오해하지 말 것</th></tr></thead><tbody>
        <tr><td>구매 Agent</td><td>조건 확인, 예산 판단, 지갑 요청, API 재호출</td><td>실제 HTTP·터미널 도구를 실행할 수 있는 환경</td><td>개인키 전체를 직접 받는 것이 필수는 아님</td></tr>
        <tr><td>구매 지갑</td><td>자산 보유, 권한 검사, 승인·서명</td><td>Agent 연결, Base USDC, 필요 시 Base ETH<br><strong>검증 조합:</strong> Binance Agentic Wallet</td><td>서명 성공은 정산 성공과 다름</td></tr>
        <tr><td>판매 API</td><td>결제 조건 제시, Facilitator 호출, 결과 제공</td><td>공개 HTTPS, 가격, 수령 주소, 서버 설정</td><td>구매자 개인키 불필요. 단순 수령에는 판매 지갑 개인키도 불필요</td></tr>
        <tr><td>Facilitator</td><td>결제 검증, 블록체인 거래 제출, 정산 결과 반환</td><td>지원 체인·방식과 판매자 측 인증<br><strong>현재:</strong> Coinbase CDP</td><td>구매대금을 자기 자금으로 내는 주체가 아님</td></tr>
        <tr><td>Base</td><td>계약 실행, USDC 이동, 거래 기록</td><td>USDC는 결제 토큰, ETH는 가스 자산</td><td>같은 주소여도 Ethereum 메인넷 잔액과 Base 잔액은 별개</td></tr>
      </tbody></table></div>
    </div></section>

    <section class="section" id="agents"><div class="wrap"><div class="section-head"><div><span class="section-kicker">03 · 실행 환경</span><h2>지원 환경</h2></div><p class="section-intro">터미널 실행 지원과 Binance 지갑·x402 결제 검증 여부는 별도 항목입니다. 일반 채팅창이나 기본 curl은 자동 결제를 수행하지 않습니다.</p></div>
      <div class="agent-grid">
        <article class="agent-card"><h3><a href="https://docs.openclaw.ai/tools/exec" target="_blank" rel="noreferrer">OpenClaw</a></h3><p><code>exec</code>/터미널 도구와 네트워크 권한이 활성화된 실행 환경.</p><span class="verified">직접 검증: OpenClaw + Binance Agentic Wallet</span></article>
        <article class="agent-card"><h3><a href="https://hermes-agent.nousresearch.com/docs/user-guide/features/tools" target="_blank" rel="noreferrer">Hermes Agent</a></h3><p><code>terminal</code> toolset이 활성화된 실행 환경. 지갑 스킬·CLI 설치와 권한을 별도 확인해야 합니다.</p></article>
        <article class="agent-card"><h3><a href="https://docs.anthropic.com/en/docs/claude-code/cli-usage" target="_blank" rel="noreferrer">Claude Code</a></h3><p>로컬·서버 셸과 도구 권한을 사용할 수 있는 CLI 환경. 이 데모와의 지갑 결제 조합은 별도 검증 대상입니다.</p></article>
        <article class="agent-card"><h3><a href="https://help.openai.com/en/articles/11096431" target="_blank" rel="noreferrer">Codex CLI</a></h3><p>로컬·서버 터미널에서 명령을 실행할 수 있는 환경. 네트워크·승인 정책과 지갑 도구를 별도 구성해야 합니다.</p></article>
      </div>
      <div class="common-kit"><strong>공통 준비물</strong><ul><li>명령 실행 도구와 실행 권한</li><li>공식 스킬 설치용 Node.js 18+</li><li>Binance 계정과 앱의 MPC/Keyless Wallet</li><li>연결된 Agentic Wallet</li><li>그 지갑의 Base USDC</li><li>필요 시 최초 승인용 Base ETH</li><li>허용 가격·횟수·지출 정책</li></ul></div>
    </div></section>

    <section class="section" id="code"><div class="wrap"><div class="section-head"><div><span class="section-kicker">04 · 코드</span><h2>요청과 응답</h2></div><p class="section-intro">CDP SDK 1.57.1, x402 Express 2.28.0과 현재 서버 구현 기준. 실행 명령과 설명용 구조를 구분했습니다.</p></div><div class="stages">${stages}</div></div></section>

    <section class="section" id="concepts"><div class="wrap"><div class="section-head"><div><span class="section-kicker">05 · 개념</span><h2>핵심 개념</h2></div><p class="section-intro">Base64, 서명, Permit2, x402의 역할을 구분합니다.</p></div>
      <div class="qa-list">
        <details open><summary>Agentic Payment와 x402</summary><div class="qa-answer"><p><strong>Agentic Payment</strong>는 Agent가 위임받은 범위 안에서 구매·결제를 수행하는 행동입니다. <strong>x402</strong>는 HTTP 요청과 응답에서 가격·서명·영수증을 주고받는 통신 규칙입니다.</p></div></details>
        <details><summary>카드 기반 Agent 결제</summary><div class="qa-answer"><p>카드 기반 Agent 결제도 Agentic Payment입니다. x402는 서비스가 공통 형식으로 결제 조건을 제시해 Agent와 API가 직접 상호운용하도록 돕습니다. 카드를 모두 대체한다는 뜻은 아닙니다.</p></div></details>
        <details><summary>회원가입과 로그인</summary><div class="qa-answer"><p>건별 디지털 리소스 구매에서는 줄일 수 있습니다. 배송, 연령·신원 확인, 환불, 구독, 서비스 정책에 필요한 정보는 별개입니다.</p></div></details>
        <details><summary>결제 서명의 의미</summary><div class="qa-answer"><p>특정 결제 조건에 대한 암호학적 허가 증거입니다. 잔액 보장, 입금 완료, 사람이 매번 화면을 직접 확인했다는 증거는 아닙니다.</p></div></details>
        <details><summary>개인키 관리</summary><div class="qa-answer"><p><code>baw</code>는 지갑에 서명을 요청하는 도구입니다. Binance MPC 지갑은 키를 분산 관리해 Agent에게 개인키 전체를 건네는 구조가 아닙니다. 확인하지 않은 키 조각의 구체적 저장 위치는 이 데모에서 추정하지 않습니다.</p></div></details>
        <details><summary>Base64, hash, signature</summary><div class="qa-answer"><table class="mini-table"><thead><tr><th>개념</th><th>무엇인가</th><th>되돌릴 수 있나</th></tr></thead><tbody><tr><td>Base64</td><td>바이너리/문자를 안전한 문자로 표현</td><td>예 · 암호화 아님</td></tr><tr><td>Hash</td><td>데이터의 고정 길이 지문</td><td>일반적으로 원문 복원 불가</td></tr><tr><td>Signature</td><td>특정 키가 특정 데이터에 허가했음을 검증하는 값</td><td>원문 복원이 목적이 아님</td></tr></tbody></table><p><code>Hello → SGVsbG8= → Hello</code>. 가운데 값은 Base64이며 누구나 되돌릴 수 있습니다.</p></div></details>
        <details><summary>Permit2와 EIP-3009</summary><div class="qa-answer"><p>Permit2는 먼저 토큰 컨트랙트가 Permit2 사용을 승인한 뒤, nonce가 있는 건별 서명으로 결제를 허가할 수 있습니다. EIP-3009는 토큰 자체의 서명 기반 전송 기능을 사용합니다. 현재 데모의 성공 경로는 Permit2입니다. 이전 EIP-3009 시도는 CDP에서 <code>execution reverted</code>로 거절됐지만 원인은 확정되지 않았습니다.</p></div></details>
        <details><summary>Facilitator의 역할</summary><div class="qa-answer"><p>서명 검증, 블록체인 거래 제출, 정산 결과 확인을 대신합니다. 외부 업체가 반드시 필요한 것은 아니며 직접 구현할 수도 있습니다. 현재 데모는 Coinbase CDP를 사용합니다.</p></div></details>
      </div>
    </div></section>

    <section class="section" id="try"><div class="wrap"><div class="section-head"><div><span class="section-kicker">06 · 체험</span><h2>결제 체험</h2></div><p class="section-intro">지갑 연결과 0.01 USDC 구매를 별도 지시문으로 제공합니다. 페이지는 비밀정보를 입력받지 않습니다.</p></div>
      <div class="try-grid"><article class="prompt-card"><h3>1. 지갑 연결 지시문</h3><p>설치·로그인·잔액 조회까지만. 송금과 결제는 금지합니다.</p>${codeBlock("prompt-connect", "Agent에게 그대로 전달", connectPrompt)}</article><article class="prompt-card"><h3>2. 구매 지시문</h3><p>가격·횟수·재시도 정책과 결과 보고 형식을 고정합니다.</p>${codeBlock("prompt-buy", "Agent에게 그대로 전달", purchasePrompt)}</article></div>
      <p class="privacy-note">이 페이지는 구매자 개인키, 복구 문구, Binance 로그인 토큰, PAYMENT-SIGNATURE를 입력받지 않습니다.</p><p style="text-align:center"><a href="https://developers.binance.com/en/docs/products/agentic-wallet/quickstart/install-agentic-wallet" target="_blank" rel="noreferrer">Binance 공식 설치 안내 열기 ↗</a></p>
    </div></section>

    <section class="section" id="result"><div class="wrap"><div class="section-head"><div><span class="section-kicker">07 · 검증</span><h2>실제 검증 기록</h2></div><p class="section-intro">2026-10-04 KST에 OpenClaw와 Binance Agentic Wallet로 현재 0.01 USDC 상품을 결제했습니다.</p></div>
      <div class="result-demo"><article class="receipt"><span class="receipt-label">현재 상품 · 실제 결제</span><div class="receipt-price">0.01 USDC</div><p>Agent가 실제 결제에 성공했습니다.</p><div class="receipt-grid"><div><span>검증 시각</span><strong>${VERIFIED_AT}</strong></div><div><span>HTTP</span><strong>200 OK</strong></div><div><span>정산</span><strong>PAYMENT-RESPONSE success</strong></div><div><span>온체인</span><strong>receipt status 1</strong></div><div><span>구매자 잔액</span><strong>25.375221 → 25.365221 USDC</strong></div><div><span>판매자 잔액</span><strong>1.000000 → 1.010000 USDC</strong></div><div><span>Permit2 승인</span><strong>신규 거래 없음</strong></div><div><span>거래</span><strong><a href="https://basescan.org/tx/${VERIFIED_TX}" target="_blank" rel="noreferrer">BaseScan ↗</a></strong></div></div><p class="aside">구매 지갑 ${VERIFIED_BUYER}. Base 블록 52142027의 USDC Transfer는 구매자 −10000, 판매자 +10000으로 확인됐습니다.</p></article>
        <article class="historic"><span class="tag">이전 PoC — 1 USDC</span><h3>현재 0.01 USDC 상품과 다른 기록</h3><p>2026-10-03 KST에 Permit2 승인과 1 USDC 정산을 실제로 완료한 선행 검증입니다.</p><div class="status-list"><div class="status-row"><span>상품 결제액</span><strong>1.00 USDC</strong></div><div class="status-row"><span>승인 거래</span><a href="https://basescan.org/tx/0x78eb17eb144b07b20c9b3b4b1efa1315bd14a98733ad57f689aba45af5a3ebf8" target="_blank" rel="noreferrer">BaseScan ↗</a></div><div class="status-row"><span>정산 거래</span><a href="https://basescan.org/tx/0xfee20cbac05359c29cd2fbc3966197d177941bb3045c9b85adeeb6b2f49c1cb5" target="_blank" rel="noreferrer">BaseScan ↗</a></div></div><p>CLI 지출 한도 사용량은 서명 시도로 증가할 수 있어 실제 온체인 출금액과 같다고 볼 수 없습니다.</p></article>
      </div>
    </div></section>

    <section class="section" id="implications"><div class="wrap"><div class="section-head"><div><span class="section-kicker">08 · 범위</span><h2>적용 범위와 제약</h2></div></div>
      <div class="insight-grid"><article class="insight-card"><h3>Agent 구매</h3><p>데이터·검색·컴퓨팅·도구를 건별로 구매하고 후속 작업을 계속할 수 있습니다.</p></article><article class="insight-card"><h3>권한 범위</h3><p>전체 지갑 통제권 대신 예산·대상·횟수를 제한한 구매 권한을 사용할 수 있습니다.</p></article><article class="insight-card"><h3>API 판매</h3><p>판매 API는 가격과 수령 주소를 결제 조건으로 제공합니다.</p></article><article class="insight-card"><h3>적용 한계</h3><p>x402는 카드 결제 전체나 배송·신원 확인·서비스 정책을 대체하지 않습니다.</p></article><article class="insight-card"><h3>운영 과제</h3><p>체인·토큰·서명·가스·Facilitator 호환, 응답 유실 복구, 중복 청구 방지가 필요합니다.</p></article><article class="insight-card"><h3>현재 설정</h3><p>Base 8453 · USDC <code>${USDC_ADDRESS}</code> · exact + Permit2 · ${escapeHtml(payTo)}.</p></article></div>
      <div class="source-list" aria-label="공식 참고 문서"><a href="https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md" target="_blank" rel="noreferrer">x402 v2 공식 사양 ↗</a><a href="https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md" target="_blank" rel="noreferrer">Exact EVM · Permit2 사양 ↗</a><a href="https://docs.cdp.coinbase.com/x402/seller/facilitator" target="_blank" rel="noreferrer">Coinbase CDP Facilitator ↗</a><a href="https://raw.githubusercontent.com/binance/binance-skills-hub/main/skills/binance-web3/binance-agentic-wallet/references/x402-payment.md" target="_blank" rel="noreferrer">Binance x402 CLI 명세 ↗</a></div>
    </div></section>
  </main>
  <footer class="footer"><strong>x402 Agentic Payment PoC</strong><br>교육과 실제 결제 체험을 위한 개인 구현 · Bloom, Binance, Coinbase의 공식 서비스나 제휴 상품이 아닙니다.<br><a href="${safeBaseUrl}/demo">유료 API 엔드포인트</a></footer>
  <div class="copy-status" role="status" aria-live="polite">클립보드에 복사했습니다.</div>
  <script>
    const status = document.querySelector('.copy-status');
    let statusTimer;
    async function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select(); document.execCommand('copy'); area.remove();
    }
    document.querySelectorAll('[data-copy-target]').forEach(button => button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copyTarget); if (!target) return;
      try { await copyText(target.textContent); button.textContent = '복사됨'; status.classList.add('show'); clearTimeout(statusTimer); statusTimer = setTimeout(() => status.classList.remove('show'), 1700); setTimeout(() => button.textContent = '복사', 1500); }
      catch { button.textContent = '복사 실패'; setTimeout(() => button.textContent = '복사', 1500); }
    }));
  </script>
</body>
</html>`;
}
