<p align="center">
  <img src="assets/github-logo.png" alt="PixelCrypto logo" width="140" height="140">
</p>

<h1 align="center">PixelCrypto — SAO Futures Trading Dashboard</h1>

แดชบอร์ดเทรด BTC Futures สไตล์ pixel-art / Sword Art Online สำหรับทดลองระบบสัญญาณ, Binance Futures Testnet และ DeepSeek signal scoring ในหน้าเดียว

![PixelCrypto Dashboard](assets/sao-office.png)

## โปรเจคนี้คืออะไร?

PixelCrypto เป็นเว็บแอป React แบบไม่ต้อง build ที่จำลองโถงออฟฟิศ SAO พร้อมตัวละคร agent บน Dashboard:

- `Ping-CEO` เป็น Kirito อยู่กลางห้อง
- `Asuna` แสดงสัญญาณจากระบบ Live Signal
- `Eugeo` แสดง Balance
- `Alice` แสดง Unrealized P&L
- `Sinon` เป็น DeepSeek Signal Scorer พร้อมปุ่ม `Ask AI`

ระบบใช้ข้อมูลตลาดจริงจาก Binance Futures เพื่อคำนวณสัญญาณ และสามารถส่งคำสั่งไป Binance Futures Testnet ได้จริงด้วยเงินปลอม

> คำเตือน: โปรเจคนี้ใช้สำหรับทดลอง/ศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน และห้ามนำคีย์บัญชีจริงมาใช้

## ฟีเจอร์หลัก

- **SAO dashboard** — โถงออฟฟิศ pixel-art พร้อมตัวละคร SAO แบบ isometric
- **Live Prices** — แสดงราคาเหรียญหลัก 3 ตัวแบบ real-time พร้อมสัญลักษณ์เหรียญ
- **Live Signal** — คำนวณสัญญาณ BTC จาก Binance Futures klines, OI และ funding
- **Timeframe selector** — เลือก `1h`, `4h`, `1d`, `1week` โดยค่าเริ่มต้นเป็น `4h`
- **Signal refresh** — อัปเดตทุก 10 วินาที พร้อมเวลาอัปเดตล่าสุดและ countdown รอบถัดไป
- **Binance Futures Testnet** — ดู balance, unrealized P&L, open position และส่ง order ไป testnet
- **Open Long / Open Short** — ใส่จำนวน USDT แล้วส่ง JSON ไปเปิด position จริงบน testnet
- **Stop loss / Take profit** — ส่ง SL/TP อัตโนมัติหลัง market order สำเร็จ
- **DeepSeek Signal Scorer** — ปุ่ม `Ask AI` ที่ตัวละคร Sinon เพื่อส่ง feature JSON ให้ DeepSeek review สัญญาณ
- **Auto LINE Alert** — เมื่อ Live Signal เป็น `LONG/SHORT` และ confidence สูงมาก ระบบส่ง alert เข้า LINE อัตโนมัติผ่าน Messaging API
- **Project logo** — README/GitHub logo, favicon และ app icon แบบ rounded pixel-art

## Live Signal ทำงานอย่างไร?

ระบบคำนวณสัญญาณแบบ non-ML จากข้อมูลตลาดจริง:

### Long

```text
Close > EMA200
AND EMA50 > EMA200
AND Close > DonchianHigh(55)
AND RSI(14) > 55
AND oi_z > 0
AND funding_z < 1.5
```

### Short

```text
Close < EMA200
AND EMA50 < EMA200
AND Close < DonchianLow(55)
AND RSI(14) < 45
AND oi_z > 0
AND funding_z > -1.5
```

### Risk

Live Signal แสดงระยะ `3 * ATR(14)` และตอนส่ง order จะสร้างราคาออกอัตโนมัติ:

- Long: `SL = price - 3ATR`, `TP = price + 2 * 3ATR`
- Short: `SL = price + 3ATR`, `TP = price - 2 * 3ATR`

ฝั่ง server จะยิง market order ก่อน แล้วตามด้วย conditional order:

- `STOP_MARKET`
- `TAKE_PROFIT_MARKET`
- `reduceOnly: true`
- `workingType: MARK_PRICE`

## DeepSeek Signal Scorer

ตัวละคร `Sinon` ทำหน้าที่เป็น Signal Scorer + Risk Checker

เมื่อกดปุ่ม `Ask AI` ระบบจะ:

1. ดึงข้อมูล BTCUSDT Perpetual Futures จาก Binance Futures ทั้ง `1h`, `4h`, `1d`, `1week`
2. คำนวณ feature เช่น EMA, RSI, MACD histogram, ATR, volume z-score, OI, funding, basis, Donchian breakout
3. คำนวณ preliminary score เองก่อน
4. ส่ง feature JSON ให้ DeepSeek
5. รับ strict JSON กลับมาเป็น final signal review
6. normalize response ให้เข้ารูปแบบที่ระบบใช้ เช่น `ENTER_LONG`, `ENTER_SHORT`, `WAIT`
7. แสดงผลใน `Sinon Signal Details` เป็นภาษาคนอ่าน พร้อม tab แยกแต่ละ timeframe

ถ้ายังไม่มี `DEEPSEEK_API_KEY` ระบบจะคืน local preliminary score แทน เพื่อให้ UI ใช้งานรอ key ได้

## วิธีรัน

โปรเจคนี้ใช้ Node.js built-in server และ React จาก CDN ไม่มีขั้นตอน build

```bash
git clone <your-repo-url>
cd ai-agents-pixels

node server.js
```

เปิดหน้าเว็บ:

```text
http://localhost:3000
```

กำหนด port เองได้:

```bash
PORT=4000 node server.js
```

## Deploy บน Vercel

โปรเจคนี้รองรับ Vercel แล้ว โดยยังเก็บ local dev server เดิมไว้

- Local: `node server.js` รันที่ `http://localhost:3000`
- Vercel: static files อยู่ที่ root และ API อยู่ใต้ `api/`
- API logic ใช้ handler เดียวกับ local server เพื่อลดโอกาส behavior ต่างกัน

ไฟล์ที่เกี่ยวข้อง:

```text
vercel.json
.vercelignore
api/testnet/status.js
api/testnet/account.js
api/testnet/order.js
api/deepseek/signal.js
server.js
```

ตั้งค่า Environment Variables ใน Vercel Project Settings:

```text
BINANCE_TESTNET_KEY
BINANCE_TESTNET_SECRET
DEEPSEEK_API_KEY
LINE_CHANNEL_ACCESS_TOKEN
LINE_TO_ID
```

หลัง deploy แล้ว endpoint จะเป็น path เดิม:

```text
https://your-project.vercel.app/api/testnet/status
https://your-project.vercel.app/api/testnet/account
https://your-project.vercel.app/api/testnet/order
https://your-project.vercel.app/api/deepseek/signal
```

หมายเหตุ:

- ห้าม upload `binance.config.json` ไป Vercel
- `.vercelignore` กันไฟล์ config/local/private ออกจาก Vercel CLI deploy
- Vercel Functions ตั้ง `maxDuration` ไว้ 30 วินาที เพราะ DeepSeek multi-timeframe อาจใช้เวลาหลาย request
- ถ้าต้องการ GitHub Social Preview ให้ใช้รูป `assets/github-logo.png` ใน repo settings

## การตั้งค่า API Keys

คัดลอกไฟล์ตัวอย่าง:

```bash
cp binance.config.example.json binance.config.json
```

ใส่ค่าใน `binance.config.json`:

```json
{
  "testnet": true,
  "apiKey": "BINANCE_FUTURES_TESTNET_KEY",
  "apiSecret": "BINANCE_FUTURES_TESTNET_SECRET",
  "DEEPSEEK_API_KEY": "DEEPSEEK_API_KEY",
  "LINE_CHANNEL_ACCESS_TOKEN": "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN",
  "LINE_TO_ID": "LINE_USER_OR_GROUP_ID"
}
```

หรือใช้ environment variables:

```bash
BINANCE_TESTNET_KEY=... BINANCE_TESTNET_SECRET=... DEEPSEEK_API_KEY=... LINE_CHANNEL_ACCESS_TOKEN=... LINE_TO_ID=... node server.js
```

### LINE Alert ทำงานยังไง?

LINE Notify ปิดบริการแล้ว ระบบนี้จึงใช้ LINE Messaging API ของ LINE Official Account:

1. สร้าง LINE Official Account และ Messaging API channel ใน LINE Developers
2. นำ Channel access token มาใส่ใน `LINE_CHANNEL_ACCESS_TOKEN`
3. ให้บัญชี LINE ของคุณ add official account นั้นเป็นเพื่อน หรือเชิญ bot เข้ากลุ่ม
4. ใส่ target id ใน `LINE_TO_ID`
   - ส่งหาตัวเอง: ใช้ User ID ของคุณจาก LINE Developers Console
   - ส่งเข้ากลุ่ม: ใช้ Group ID จาก webhook event หลังเชิญ bot เข้ากลุ่ม
5. เปิดแอปไว้หรือ deploy บน Vercel ให้ server ทำงาน

เมื่อ Live Signal เป็น `LONG` หรือ `SHORT` และ confidence `>= 90%` ระบบจะส่ง LINE อัตโนมัติ พร้อม cooldown 30 นาทีต่อ symbol/timeframe/direction เพื่อกันสแปม

ข้อควรระวัง:

- ใช้คีย์จาก Binance Futures Testnet เท่านั้น
- `binance.config.json` ถูก `.gitignore`
- server บล็อกการเสิร์ฟ `binance.config.json`
- คีย์ไม่ถูกส่งไป browser
- LINE credentials อยู่ฝั่ง server เท่านั้น ห้ามใส่ใน frontend

## API Endpoints

| Endpoint | Method | หน้าที่ |
|---|---:|---|
| `/api/testnet/status` | `GET` | เช็ค Binance testnet และสถานะ DeepSeek key |
| `/api/testnet/account` | `GET` | อ่าน balance, unrealized P&L และ positions |
| `/api/testnet/order` | `POST` | เปิด/ปิด position บน Binance Futures Testnet |
| `/api/deepseek/signal` | `POST` | คำนวณ feature และส่งให้ DeepSeek review |
| `/api/line/signal` | `POST` | ส่ง high-confidence signal เข้า LINE จาก app logic |

ตัวอย่างเช็คสถานะ:

```bash
curl -sS http://localhost:3000/api/testnet/status
curl -sS http://localhost:3000/api/testnet/account
curl -sS -X POST http://localhost:3000/api/deepseek/signal
```

ตัวอย่างเปิด Long:

```bash
curl -sS -X POST http://localhost:3000/api/testnet/order \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","direction":"LONG","side":"BUY","notionalUsdt":150}'
```

## โครงสร้างโปรเจค

```text
.
├── index.html                  # Entry point, loads React/Babel/CDN scripts
├── server.js                   # Static server + Binance testnet bridge + DeepSeek scorer
├── vercel.json                 # Vercel functions/static config
├── api/                        # Vercel API functions that reuse server.js handler
├── app.jsx                     # Root state, dashboard wiring, order action handlers
├── signals.jsx                 # Live Signal calculation and Open Long/Short UI
├── prices.jsx                  # Live prices and testnet account hooks
├── sidebar.jsx                 # Stats, signal card, prices, team, activity log
├── room.jsx                    # SAO office scene and agent rendering
├── pixel-sprite.jsx            # SAO character resources and agent component
├── sim.jsx                     # Shared constants, stations, simulated outcomes
├── analysis.jsx                # Analysis page
├── analysis-model.js           # Analysis workflow model
├── analysis-claude.js          # Stored analysis briefs
├── views.jsx                   # History and Settings views
├── styles.css                  # Pixel-art UI styles
├── tests/
│   └── analysis-model.test.js
├── assets/
│   ├── sao-office.png
│   ├── github-logo.png
│   ├── web-icon.png
│   └── agents/sao/
└── binance.config.example.json
```

## การทดสอบ

```bash
node --check server.js
node tests/analysis-model.test.js
```

## หมายเหตุด้านความปลอดภัย

- คำสั่งเทรดถูกจำกัดไว้ที่ `BTCUSDT`
- จำกัด order size ผ่าน safety rails ใน server
- SL/TP เป็น conditional order บน testnet และอาจ fail ได้ถ้า Binance reject เงื่อนไขราคา
- ถ้า exit order fail ระบบจะแจ้งกลับใน response แต่ market order ที่สำเร็จจะยังถือว่าสำเร็จ
- DeepSeek ใช้เป็น scorer/risk checker เท่านั้น ไม่ใช่ตัวทำนายราคาหรือ final trading authority

## License

MIT
