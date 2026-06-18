# AGENTS.md

คู่มือ handoff สำหรับ Codex, Claude หรือ coding agent ตัวอื่นที่เข้ามาแก้โปรเจคนี้

## Project Snapshot

PixelCrypto เป็นเว็บแอป React แบบไม่ต้อง build สำหรับ dashboard เทรด Binance Futures Testnet สไตล์ pixel-art / Sword Art Online

- Frontend ใช้ React + Babel จาก CDN ใน `index.html`
- Backend ใช้ Node.js built-in modules เท่านั้นใน `server.js`
- Local dev รันด้วย `node server.js` ที่ port `3000`
- Vercel deploy ใช้ static files ที่ root และ API wrappers ใน `api/`
- Binance เป็น Futures Testnet เท่านั้น
- DeepSeek ใช้เป็น signal scorer / risk checker ผ่าน server-side API

## Current Product Behavior

- Dashboard เป็นโถง SAO office ใน `assets/sao-office.png`
- Agent หลัก:
  - `Ping-CEO` คือ Kirito
  - `Asuna` แสดง Live Signal
  - `Eugeo` แสดง Balance
  - `Alice` แสดง Unrealized P&L
  - `Sinon` เป็น DeepSeek Signal Scorer และมีปุ่ม `Ask AI`
- ตัวละครยืนอยู่กับที่ ไม่เดินสุ่มแล้ว
- Desktop และ mobile layout ใช้ตำแหน่งตัวละครคนละชุดเพื่อกันการซ้อนกัน
- Top nav มี Dashboard, Mobile UI, History, Settings
- ปุ่ม `Mobile UI` แสดงเฉพาะ desktop/tablet กว้าง และซ่อนบนมือถือจริง
- Sidebar ด้านบนแสดง BTCUSDT ticker แทน brand เดิม
- ไม่มี Live Prices panel ด้านล่างแล้ว

## Important User Preferences

- ห้าม commit หรือ push เว้นแต่ผู้ใช้สั่งชัดเจน
- ห้าม stage/commit secret เช่น `binance.config.json`
- ถ้าผู้ใช้ขอ UI change ให้แก้จริงและ verify ใน browser เมื่อทำได้
- ถ้าแก้ frontend ให้ระวัง mobile viewport ไม่ให้ text/card/agent ซ้อนกัน
- ควรตอบสั้น กระชับ เป็นภาษาไทย

## Project Structure

```text
.
├── index.html                  # Entry point, React/Babel CDN, cache-busting query strings
├── server.js                   # Static server, Binance testnet bridge, DeepSeek scorer, shared API handler
├── vercel.json                 # Vercel routing/functions config
├── api/                        # Vercel functions that call handleApi() from server.js
│   ├── deepseek/signal.js
│   └── testnet/{status,account,order}.js
├── app.jsx                     # Root state, mobile layout flag, agent display wiring, order handlers
├── room.jsx                    # Dashboard room renderer and Agent placement scale
├── pixel-sprite.jsx            # Agent component, SAO character resources, roster
├── sidebar.jsx                 # Top nav, BTC ticker, Live Stats, Signal card, Team, Activity Log
├── signals.jsx                 # Live Signal formula, timeframe selector, order UI, SL/TP plan
├── prices.jsx                  # Binance price websocket and testnet account hooks
├── sim.jsx                     # Shared constants/stations/outcome helpers
├── analysis.jsx                # Analysis page UI
├── analysis-model.js           # Analysis workflow model
├── analysis-claude.js          # Stored analysis briefs
├── views.jsx                   # History and Settings views
├── styles.css                  # Main responsive/pixel-art styling
├── tests/analysis-model.test.js
├── assets/
│   ├── sao-office.png
│   ├── github-logo.png
│   ├── web-icon.png
│   └── agents/sao/
├── binance.config.example.json
└── README.md
```

## Key Files To Edit

- Dashboard scene/agent layout: `app.jsx`, `room.jsx`, `styles.css`
- Agent names/images/messages/resources: `pixel-sprite.jsx`, `assets/agents/sao/`
- Sidebar/menu/live stats/signal card placement: `sidebar.jsx`, `signals.jsx`, `styles.css`
- Signal formula/timeframes/countdown: `signals.jsx` and mirrored DeepSeek feature logic in `server.js`
- Binance Testnet orders/account: `server.js`
- Vercel API behavior: `server.js` plus wrappers in `api/`
- Cache bust after frontend changes: query strings in `index.html`

## Runtime And Config

Local:

```bash
node server.js
```

Open:

```text
http://localhost:3000
```

Environment variables:

```text
BINANCE_TESTNET_KEY
BINANCE_TESTNET_SECRET
DEEPSEEK_API_KEY
LINE_CHANNEL_ACCESS_TOKEN
LINE_TO_ID
```

Local config fallback:

```text
binance.config.json
```

Never commit `binance.config.json`. It contains private credentials and is intentionally ignored/blocked.

## Binance And Trading Safety

- Use Binance Futures Testnet only.
- Server signs Binance requests; keys must never reach the browser.
- `/api/testnet/order` is the only path that places orders.
- `/api/line/signal` sends LINE alerts from guarded app logic only.
- Order flow:
  - Market order first
  - Then optional `STOP_MARKET` and `TAKE_PROFIT_MARKET`
  - Exit orders use `reduceOnly: true` and `workingType: MARK_PRICE`
- If SL/TP placement fails after market order succeeds, response should expose the failure so UI can debug it.
- Keep safety rails in `server.js` conservative.

## Live Signal Logic

Default timeframe is `4h`. Supported values:

```text
1h, 4h, 1d, 1week
```

Current non-ML entry rules:

Long:

```text
Close > EMA200
AND EMA50 > EMA200
AND Close > DonchianHigh(55)
AND RSI(14) > 55
AND oi_z > 0
AND funding_z < 1.5
```

Short:

```text
Close < EMA200
AND EMA50 < EMA200
AND Close < DonchianLow(55)
AND RSI(14) < 45
AND oi_z > 0
AND funding_z > -1.5
```

Exit:

```text
ATR trailing/stop distance = 3 * ATR(14)
Long SL = price - 3ATR, TP = price + 2 * 3ATR
Short SL = price + 3ATR, TP = price - 2 * 3ATR
```

Frontend signal logic is in `signals.jsx`; DeepSeek feature/preliminary scoring is in `server.js`. Keep formulas aligned when changing signal behavior.

## DeepSeek / Sinon

- Sinon has an `Ask AI` button in the dashboard.
- Clicking it calls `/api/deepseek/signal` with timeframes `1h`, `4h`, `1d`, `1week`.
- The modal summarizes response in human-readable form and includes debug sections for failures.
- If DeepSeek key is missing, server returns local/preliminary scoring so UI can still work.
- For Vercel debugging, preserve response metadata: HTTP status, status text, stage, environment, configured flag, detail/raw when available.

## LINE Signal Alerts

- Use LINE Messaging API, not LINE Notify. LINE Notify ended service on March 31, 2025.
- Required server-side config:
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_TO_ID`
- Auto LINE alert is enabled by `settings.autoLine`.
- The UI should show auto LINE status only for high-confidence LONG/SHORT signals.
- Current confidence threshold is `>= 80%` for any timeframe.
- The frontend auto-sends with cooldown 30 minutes per symbol/timeframe/direction.
- The server must require `confirmed: true` from app logic and re-check direction/confidence before pushing.
- Never expose LINE credentials to browser code.

## Mobile Layout Notes

Mobile is controlled in `app.jsx`:

- `mobilePreview` is toggled from desktop nav.
- `isMobileViewport` watches `(max-width: 920px)`.
- `mobileLayout = mobilePreview || isMobileViewport`.
- `MOBILE_STARTS` separates agent positions on mobile.
- `Room` receives `compact={mobileLayout}` and lowers agent scale.
- `.compact-agents` styles reduce bubble size and button spacing.

When changing mobile layout, verify:

- Agents do not overlap on viewport around `390x844`.
- Mobile nav hides `Mobile UI`.
- Desktop remains non-compact.
- Room keeps a real width/height; avoid CSS that collapses `.room` inside flex layout.

## Testing Checklist

Run at minimum:

```bash
node --check server.js
node tests/analysis-model.test.js
```

For frontend/UI changes:

- Run local server if needed: `node server.js`
- Open `http://localhost:3000`
- Hard reload or bump cache key in `index.html`
- Verify desktop and mobile viewport
- Inspect console if UI is blank

Useful browser assertions:

- No `DUNGEONOPS` text in sidebar
- BTC ticker is visible
- No `Live Prices` panel
- No `Party standing by on the front rail` hint
- Mobile agent sprites have no bounding-box overlap

## Git Workflow

Before editing:

```bash
git status --short
```

Expected user workflow:

- Make focused edits.
- Stage only files related to the request.
- Do not commit/push unless user explicitly asks.
- Do not revert unrelated user changes.
- If there are staged changes from a previous request, preserve them unless instructed otherwise.

Safe commands:

```bash
git diff -- <file>
git diff --cached --stat
git status --short
```

## Vercel Notes

- Vercel env vars must be set in Project Settings:
  - `BINANCE_TESTNET_KEY`
  - `BINANCE_TESTNET_SECRET`
  - `DEEPSEEK_API_KEY`
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_TO_ID`
- API wrappers in `api/` should stay tiny and delegate to `handleApi(req,res)` from `server.js`.
- Do not import browser/frontend code into Vercel functions.
- `server.js` must remain usable both as local server and as exported API handler.

## Style Guidance

- Keep the SAO/pixel-art dashboard visual language consistent.
- Prefer existing components and CSS classes over new abstractions.
- Use compact utilitarian UI for trading controls; avoid landing-page/marketing sections.
- Avoid overlapping text, bubbles, cards, and sprites.
- For fixed UI controls, give stable dimensions to prevent layout shift.
- When replacing assets, update cache query strings in `index.html`.

## Common Gotchas

- `index.html` loads JSX through Babel CDN; syntax errors can blank the page.
- Cache-busting query strings matter because Chrome may keep old scripts/styles.
- `.room` sizing is sensitive inside flex layout; use width/aspect-ratio carefully.
- Mobile agent positions are not the same as desktop positions.
- DeepSeek failures can be Vercel env/config issues; preserve debug response instead of swallowing it.
- Binance order success and SL/TP success are separate concerns.
- `binance.config.json` must remain local only.
