# PixelCrypto — แดชบอร์ด AI Crypto Trading

จำลองห้องเทรดคริปโตสไตล์ pixel-art ที่มี AI agents คอยเทรด วิเคราะห์ตลาด และบริหารพอร์ต — พร้อม **ราคา crypto real-time จาก Binance**

![PixelCrypto Dashboard](assets/room.png)

## โปรเจคนี้คืออะไร?

PixelCrypto แสดงภาพห้องเทรดเสมือนจริง ที่มี AI agents เดินไปมาระหว่างสถานีทำงาน นั่งวิเคราะห์ และส่งคำสั่งเทรด — ทั้งหมดเรนเดอร์ในสไตล์ pixel-art ย้อนยุค พร้อม panel ราคาคริปโตที่อัปเดต **real-time tick-by-tick** จาก Binance

> ⚠️ **ราคาจริง แต่การเทรดเป็น paper เท่านั้น** — ไม่มีการส่งคำสั่งซื้อขายจริง ไม่ต้องใช้ API key/secret ไม่แตะเงินจริง เพื่อการศึกษา/เดโมเท่านั้น

## ฟีเจอร์หลัก

- **ราคา Binance real-time** — panel "Live Prices" สตรีมราคา 10 เหรียญผ่าน WebSocket (tick-by-tick) พร้อม % เปลี่ยนแปลง 24 ชม. (เขียว=ขึ้น / แดง=ลง)
- **ซิมูเลชันสด** — AI agents 6 ตัว เดินระหว่าง 11 สถานี (Trading Desk, Analytics Bay, Signal Garden ฯลฯ) เทรดคริปโตโดย **ใช้ราคาจริงจาก Binance**
- **ติดตามพอร์ตแบบเรียลไทม์** — ยอดเงิน (USDT), P&L, และกราฟ equity อัปเดตทุก tick
- **คลิกสถานีได้** — ส่ง agent ที่ว่างใกล้ที่สุดไปทำงานทันที
- **หน้า Analysis (✨ Claude-authored)** — บทวิเคราะห์รายเหรียญเขียนโดย Claude weave เข้า workflow 6 agent → ฟันธง **LONG / SHORT / WAIT** (ดูหัวข้อ "Claude วิเคราะห์ตลาด")
- **ประวัติการเทรด** — บันทึกทุกการเทรด พร้อมเหรียญ, จำนวน, ราคา และ P&L
- **Settings** — เปิด/ปิด autopilot, animation, สี, ป้ายชื่อ agent และระดับความก้าวร้าว
- **Binance Futures Testnet** — ต่อบัญชี testnet (เงินปลอม) ดูยอด/สถานะการเชื่อมต่อแบบ read-only (ดูหัวข้อด้านล่าง)

## เหรียญที่รองรับ (คู่ USDT)

`BTC · ETH · BNB · SOL · XRP · ADA · DOGE · AVAX · LINK · TON`

## วิธีรัน

ไม่ต้อง build และ **ไม่ต้องมี API key** — เปิดเซิร์ฟเวอร์ static ตัวเล็ก (Node เพียวๆ ไม่มี dependency)

```bash
git clone <your-repo-url>
cd ai-agents

node server.js
# กำหนดพอร์ตเอง:  PORT=4000 node server.js
```

จากนั้นเปิด `http://localhost:3000`

> ใช้ `npx serve .` หรือเปิด `index.html` ตรงๆ ก็ได้เช่นกัน — ราคายังขึ้นเพราะเบราว์เซอร์ต่อ Binance ตรง ไม่ต้องพึ่งเซิร์ฟเวอร์

## ราคา real-time จาก Binance

panel **"Live Prices"** ต่อ Binance **ตรงจากเบราว์เซอร์** — เพราะ public market data ของ Binance
เปิด CORS (`Access-Control-Allow-Origin: *`) และ WebSocket ไม่ติด CORS จึง**ไม่ต้องมี proxy**

```
เบราว์เซอร์ ──WebSocket──▶ wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/...   (real-time)
            ──REST snapshot──▶ api.binance.com/api/v3/ticker/24hr?symbols=[...]              (เติมค่าตอนเปิด/fallback)
```

- [`prices.jsx`](prices.jsx) — hook `useBinancePrices()` + panel `MarketPrices`; เขียนราคาล่าสุดลง `window.__livePrices` ให้ sim ใช้
- ราคาที่ได้ป้อนเข้าการเทรดของ agent ด้วย เช่น `BUY BTC ×0.07 @ $69,814 → +$320`

**❓ ต้องต่อ MCP ไหม?** — **ไม่ต้อง** MCP เชื่อมเครื่องมือเข้ากับตัว AI agent (Claude) ไม่ได้เชื่อมกับ
เบราว์เซอร์ที่รันแอป หน้าเว็บจึงต่อ Binance เองโดยตรงตามด้านบน

> public market data ไม่ต้องใช้ API key — แต่ถ้าโดน geo-block ในบางภูมิภาค ลองสลับ host เป็น `api.binance.us` / `stream.binance.us`

## Binance Futures Testnet (เชื่อมต่อจริง · เงินปลอม)

นอกจากราคา real-time แล้ว ยังต่อ **Binance Futures TESTNET** เพื่อทดสอบการเข้าถึงบัญชีจริง
(เงินปลอม ไม่แตะเงินจริง) ผ่าน [`server.js`](server.js) ที่เซ็น HMAC ฝั่ง server

**ตั้งค่าคีย์ (ฝั่ง server เท่านั้น):**

1. ขอคีย์จาก https://testnet.binancefuture.com (ปุ่ม **API Key**) — ใช้คีย์ **testnet เท่านั้น**
2. คัดลอกเทมเพลตแล้วใส่คีย์:
   ```bash
   cp binance.config.example.json binance.config.json
   # แก้ apiKey / apiSecret ใน binance.config.json
   ```
3. รีสตาร์ท `node server.js`

> 🔒 `binance.config.json` ถูก `.gitignore` ไว้ และ server บล็อกการเสิร์ฟไฟล์นี้ (403)
> คีย์/secret อยู่ฝั่ง server เท่านั้น **ไม่เคยส่งไปเบราว์เซอร์** · หรือใช้ env `BINANCE_TESTNET_KEY` / `BINANCE_TESTNET_SECRET` แทนไฟล์ก็ได้

**Endpoint (read-only):**

| Endpoint | หน้าที่ |
|---|---|
| `GET /api/testnet/status` | เช็คการเชื่อมต่อ testnet + คีย์ตั้งค่าหรือยัง (ไม่เปิดเผยคีย์) |
| `GET /api/testnet/account` | ดูยอดคงเหลือ futures testnet (เซ็น HMAC + auto time-sync กัน error -1021) |

```bash
curl http://localhost:3000/api/testnet/status
curl http://localhost:3000/api/testnet/account
```

> ⚠️ ระบบนี้เป็น **read-only / paper** — ไม่มีการส่งคำสั่งเทรด และ **ไม่รองรับการเทรดด้วยเงินจริง**

## Claude วิเคราะห์ตลาด (✨ ไม่ต้องใช้ API key)

หน้า **Analysis** ใช้บทวิเคราะห์รายเหรียญที่ **เขียนโดย Claude จริง** ไม่ใช่ข้อความสุ่ม เก็บใน
[`analysis-claude.js`](analysis-claude.js) (ครบทั้ง 10 เหรียญ)

เมื่อรัน workflow ระบบจะ weave บทวิเคราะห์ของเหรียญนั้นเข้า 6-agent handoff (Pip → Iris → Mara →
Dex → Otis → Fern) แล้วฟันธง **LONG / SHORT / WAIT** พร้อมโชว์การ์ด **"✨ Claude Market Brief"**

- ✅ ไม่ต้องมี API key / ไม่มีค่าใช้จ่าย / ไม่มี backend — เนื้อหาเขียนโดย Claude จริง
- ⚠️ ไม่ใช่ inference สดทุก tick — เป็นคลังที่ **รีเฟรชได้เมื่อสั่ง**

**วิธีรีเฟรช:** เปิดโปรเจคใน Claude Code แล้วพิมพ์ "รีเฟรชบทวิเคราะห์ใน analysis-claude.js" →
Claude เขียนทับ `BRIEFS` + `GENERATED_AT` ให้ใหม่

> ⚠️ เพื่อการศึกษา/เดโมเท่านั้น — ไม่ใช่คำแนะนำการลงทุน

## โครงสร้างโปรเจค

```
├── index.html              # จุดเริ่มต้น — โหลดทุกไฟล์ผ่าน Babel standalone
├── server.js               # static dev server + Binance testnet bridge (Node zero-dep)
├── binance.config.example.json  # เทมเพลตคีย์ testnet (คัดลอกเป็น binance.config.json)
├── app.jsx             # Root component: state, simulation loop, การเชื่อมต่อทั้งหมด
├── sim.jsx             # COINS, สถานี, การสร้าง outcome (เทรดด้วยราคาจริง), logic ของ agent
├── prices.jsx          # Binance WebSocket hook + panel ราคา real-time
├── room.jsx            # เรนเดอร์ห้อง pixel-art พร้อม sprite ของ agent
├── pixel-sprite.jsx    # ตัวช่วยเรนเดอร์ pixel sprite
├── sidebar.jsx         # แผงขวา: ยอดเงิน, P&L, กราฟ equity, Live Prices, activity log
├── views.jsx           # หน้า History และ Settings
├── analysis.jsx        # หน้าวิเคราะห์ตลาด
├── analysis-model.js   # โมเดล workflow (weave brief ของ Claude → LONG/SHORT/WAIT)
├── analysis-claude.js  # ✨ คลังบทวิเคราะห์รายเหรียญ เขียนโดย Claude
├── styles.css          # สไตล์ทั้งหมด (ธีมมืด สไตล์ pixel)
└── assets/room.png     # ภาพพื้นหลังห้อง
```

## ระบบซิมูเลชันทำงานอย่างไร?

แต่ละ agent วน phase: `idle → walking → working → idle`

- **idle** — รอแล้วเลือกสถานีตาม **ระดับความก้าวร้าว** (ยิ่งสูง ยิ่งเทรดมาก)
- **walking** — เดินไปยังสถานี
- **working** — ทำงานที่สถานีและสร้าง outcome (เทรด/วิเคราะห์/เขียน note)

การเทรดดึง **ราคาจริงจาก Binance** มาคำนวณ (มีโอกาสชนะ ~66% พร้อม P&L แบบสุ่ม — paper trading)

## เทคโนโลยีที่ใช้

- **React 18** (โหลดผ่าน CDN ไม่ต้องมี bundler) + **Babel Standalone**
- **Binance public API** — WebSocket stream + REST (ไม่ต้องใช้ API key)
- CSS ล้วน สไตล์ pixel (`Pixelify Sans`, `VT323`)
- ไม่มี backend ของตัวเอง — เบราว์เซอร์ต่อ Binance ตรง

## การควบคุม

| ปุ่ม | การทำงาน |
|---|---|
| ⏸ Pause / ▶ Resume | เปิด/ปิด autopilot |
| 1× / 2× / 4× | ความเร็วของซิมูเลชัน |
| คลิกสถานี | ส่ง agent ที่ว่างใกล้ที่สุดไปทำงาน |
| Settings → Reset | รีเซ็ตซิมูเลชันกลับเป็น Day 1 |

## การทดสอบ

```bash
node --test tests/analysis-model.test.js
```

## License

MIT
