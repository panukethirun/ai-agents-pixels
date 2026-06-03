/* ===== Claude-authored crypto briefs =====
 *
 * เนื้อหาในไฟล์นี้ "เขียนโดย Claude" (ผ่าน Claude Code) ไม่ใช่ Math.random()
 * และไม่ได้เรียก API สด — จึงไม่ต้องใช้ API key และไม่มีค่าใช้จ่าย
 *
 * วิธีรีเฟรช: เปิดโปรเจคใน Claude Code แล้วสั่ง
 *   "รีเฟรชบทวิเคราะห์ใน analysis-claude.js"
 * Claude จะเขียนทับ BRIEFS + GENERATED_AT ให้ใหม่
 *
 * ⚠️ เพื่อการศึกษา/เดโมเท่านั้น — ไม่ใช่คำแนะนำการลงทุน · ราคา real-time แต่เทรดเป็น paper
 */

(function (root) {
  const GENERATED_AT = '2026-06-02';

  // บทวิเคราะห์รายเหรียญ — fields setup/catalyst/positionNote/dataQuality
  // จะถูก weave เข้า 6-agent workflow; brief/observations/rationale ใช้แสดงในการ์ด
  const BRIEFS = {
    BTC: {
      name: 'Bitcoin', sector: 'Store of value · เหรียญหลักของตลาด',
      stance: 'bullish', confidence: 70,
      brief: 'Bitcoin เป็น "เสาหลัก" ที่กำหนดทิศทางทั้งตลาด — สภาพคล่องสูงสุด ผันผวนต่ำสุดในกลุ่มคริปโต และตอนนี้ถูกขับด้วยกระแสเงินสถาบันผ่าน spot ETF กับวัฏจักรหลัง halving เป็นหลัก ตราบที่เงินไหลเข้า ETF เป็นบวก โครงสร้างขาขึ้นยังอยู่',
      observations: [
        'กระแสเงินเข้า/ออก spot ETF คือสัญญาณนำที่สำคัญสุดตอนนี้',
        'BTC dominance สูง — เงินมักเข้า BTC ก่อนค่อยหมุนไป alt',
        'รอบ halving + สภาพคล่องมหภาคเป็นกรอบใหญ่ของเทรนด์',
      ],
      setup: 'ราคายืนเหนือแนวรับหลักและพยายามดันต่อในโครงสร้างขาขึ้น',
      catalyst: 'ตัวเร่งคือกระแสเงินเข้า spot ETF ที่ยังเป็นบวกต่อเนื่อง',
      positionNote: 'spot long ขนาดพอดีเป็นแกนพอร์ต ตั้ง stop ใต้แนวรับสำคัญ',
      dataQuality: 'สภาพคล่องลึก สัญญาณราคา/ออร์เดอร์บุ๊กอ่านง่ายและสอดคล้องกัน',
      riskWarnings: [
        'ถ้า ETF พลิกเป็นไหลออกหลายวันติด เทรนด์อาจกลับเร็ว',
        'เหตุการณ์มหภาค (เฟด/ดอกเบี้ย) เหวี่ยง BTC ได้แรงในวันเดียว',
      ],
      rationale: 'BTC เป็นแกนความเสี่ยงต่ำสุดของกลุ่ม โครงสร้าง LONG เหมาะตราบที่เงิน ETF และเทรนด์ยังหนุน',
    },
    ETH: {
      name: 'Ethereum', sector: 'Smart contract · L2 · DeFi/staking',
      stance: 'bullish', confidence: 66,
      brief: 'Ethereum คือชั้นฐานของ DeFi และ L2 เกือบทั้งหมด — มูลค่ามาจาก "ค่าธรรมเนียมที่ถูกเผา" + ผลตอบแทน staking ทำให้มีเรื่องราว yield ที่หุ้น/BTC ไม่มี จุดถกเถียงคือ L2 ช่วยขยายระบบแต่ก็ดูดค่าธรรมเนียมออกจาก mainnet',
      observations: [
        'ปริมาณกิจกรรม L2 และค่าธรรมเนียมที่ถูกเผาเป็นตัวชี้ดีมานด์จริง',
        'staking yield + spot ETF เป็นแรงดึงเงินสถาบัน',
        'มักวิ่งตาม BTC แต่แรงกว่าในขาขึ้น (beta สูงกว่า)',
      ],
      setup: 'ราคาพักฐานเหนือแนวรับ พยายามตามโมเมนตัมของ BTC',
      catalyst: 'ตัวเร่งคือกิจกรรม L2/DeFi และกระแสเงินเข้า ETH ETF',
      positionNote: 'spot long รับ beta ขาขึ้น แต่เผื่อความผันผวนที่แรงกว่า BTC',
      dataQuality: 'ข้อมูล on-chain ชัด แต่สมดุล mainnet/L2 ยังประเมินยาก',
      riskWarnings: [
        'ถ้า BTC อ่อน ETH มักย่อแรงกว่าในฐานะ beta สูง',
        'narrative L2 ดูดค่าธรรมเนียมอาจกดมุมมองมูลค่าระยะกลาง',
      ],
      rationale: 'ETH ให้ upside แบบ beta สูงกว่า BTC พร้อมเรื่อง yield โครงสร้าง LONG เหมาะเมื่อ BTC เป็นขาขึ้น',
    },
    BNB: {
      name: 'BNB', sector: 'Exchange token · BNB Chain',
      stance: 'mixed', confidence: 58,
      brief: 'BNB ผูกกับระบบนิเวศ Binance โดยตรง — มูลค่ามาจาก utility (ลดค่าธรรมเนียม, ใช้บน BNB Chain) และกลไก burn รายไตรมาส จุดเปราะคือความเสี่ยงเชิงกำกับดูแลของตัว exchange เองที่สะท้อนเข้าราคาเป็นพักๆ',
      observations: [
        'การ burn รายไตรมาสช่วยลด supply อย่างเป็นระบบ',
        'ราคาผูกกับสุขภาพ/ปริมาณเทรดของ Binance',
        'ข่าวเชิงกำกับดูแลของ exchange คือความเสี่ยงเฉพาะตัว',
      ],
      setup: 'ราคาแกว่งในกรอบ รอทิศทางจากตลาดรวมและข่าว exchange',
      catalyst: 'ตัวเร่งคือกิจกรรมบน BNB Chain และกำหนดการ burn',
      positionNote: 'spot long ขนาดเล็ก รับความเสี่ยงเชิงกำกับดูแลเฉพาะตัว',
      dataQuality: 'ข้อมูล utility ชัด แต่ปัจจัยกำกับดูแลคาดเดายาก',
      riskWarnings: [
        'ข่าวกำกับดูแล/กฎหมายเกี่ยวกับ exchange กระชากราคาได้แรง',
        'ถ้าปริมาณเทรดบน Binance หด ดีมานด์ utility ลดตาม',
      ],
      rationale: 'BNB มี utility + burn หนุน แต่ความเสี่ยง exchange ทำให้ควรถือขนาดเล็กและคุมความเสี่ยง',
    },
    SOL: {
      name: 'Solana', sector: 'L1 ประสิทธิภาพสูง · meme/DeFi hub',
      stance: 'bullish', confidence: 64,
      brief: 'Solana ชนะใจตลาดด้วยความเร็ว/ค่าธรรมเนียมต่ำ จนกลายเป็นศูนย์กลางของ meme coin และ DeFi รายย่อย เป็นหนึ่งใน L1 ที่กิจกรรมจริงเยอะสุด แต่แลกมากับประวัติ network outage และความผันผวนที่สูงกว่า BTC/ETH มาก',
      observations: [
        'จำนวนธุรกรรม/ผู้ใช้ active สูง สะท้อนดีมานด์จริง',
        'เป็นฐานของกระแส meme — เงินเก็งกำไรไหลเข้าออกเร็ว',
        'ประวัติ network outage ยังเป็นความเสี่ยงด้านความเชื่อมั่น',
      ],
      setup: 'ราคาอยู่ในแนวโน้มขาขึ้นแต่แกว่งกว้าง ตามกระแส risk-on',
      catalyst: 'ตัวเร่งคือกิจกรรมบนเชน + กระแส meme/DeFi และความสนใจ ETF',
      positionNote: 'spot long รับ upside สูง แต่ลดขนาดเพราะผันผวนแรง ตั้ง stop ชัด',
      dataQuality: 'ข้อมูลกิจกรรมชัด แต่ sentiment เก็งกำไรเปลี่ยนเร็ว',
      riskWarnings: [
        'ผันผวนสูง — ย่อแรงเมื่อ risk-off มาเร็ว',
        'เหตุการณ์ network outage ซ้ำกระทบความเชื่อมั่นทันที',
      ],
      rationale: 'SOL ให้ upside เด่นเมื่อตลาด risk-on โครงสร้าง LONG เหมาะแต่ต้องคุมขนาดเพราะ vol สูง',
    },
    XRP: {
      name: 'XRP', sector: 'Payments · cross-border',
      stance: 'mixed', confidence: 55,
      brief: 'XRP เน้นการชำระเงินข้ามพรมแดน ราคาถูกขับด้วยพัฒนาการเชิงกฎหมาย/พาร์ตเนอร์มากกว่าเมตริก on-chain ทั่วไป ทำให้เคลื่อนไหวแบบ "นิ่งนาน แล้วกระชากตามข่าว" คาดเดาจังหวะยาก',
      observations: [
        'ความชัดเจนเชิงกฎหมายคือปัจจัยขับเคลื่อนหลัก',
        'มักนิ่งเป็นช่วงยาวแล้วเคลื่อนแรงตามข่าว',
        'ดีลพาร์ตเนอร์/การใช้งานจริงเป็นตัวหนุนระยะกลาง',
      ],
      setup: 'ราคาสะสมในกรอบแคบ รอตัวกระตุ้นเชิงข่าว',
      catalyst: 'ตัวเร่งคือพัฒนาการกฎหมายและดีลการใช้งานจริง',
      positionNote: 'spot long ขนาดเล็กเชิงเก็งข่าว ไม่เหมาะไล่ราคาตอนกระชาก',
      dataQuality: 'ปัจจัยข่าว/กฎหมายประเมินยาก สัญญาณ on-chain ช่วยได้จำกัด',
      riskWarnings: [
        'ข่าวกฎหมายพลิกได้ทั้งสองทาง เหวี่ยงราคาแรง',
        'การกระชากตามข่าวมักย่อกลับเร็วถ้าไล่ราคาช้า',
      ],
      rationale: 'XRP ขับด้วยข่าว/กฎหมาย จังหวะคาดเดายาก จึงควรถือขนาดเล็กหรือรอ setup ที่ชัด',
    },
    ADA: {
      name: 'Cardano', sector: 'L1 · research-driven',
      stance: 'mixed', confidence: 52,
      brief: 'Cardano เน้นแนวทาง research-first และพัฒนาอย่างค่อยเป็นค่อยไป จุดแข็งคือชุมชนเหนียวแน่นและกระจายอำนาจ จุดอ่อนคือกิจกรรม DeFi/ผู้ใช้จริงยังตามหลังคู่แข่ง ราคาจึงมักวิ่งตามกระแสตลาดมากกว่าปัจจัยเฉพาะตัว',
      observations: [
        'พัฒนาช้าแต่มั่น — กิจกรรม on-chain ยังตามหลัง L1 อื่น',
        'มักเป็น beta ของตลาด มากกว่ามี catalyst เฉพาะตัว',
        'ชุมชนแข็งแรงช่วยพยุงในขาลง',
      ],
      setup: 'ราคาพยายามตั้งฐานหลังพักตัว รอยืนยันทิศทาง',
      catalyst: 'ตัวเร่งคือการเติบโตของ DeFi/ผู้ใช้บนเชนและกระแสตลาดรวม',
      positionNote: 'spot long ขนาดเล็ก รอ confirmation ก่อนเพิ่มสถานะ',
      dataQuality: 'ข้อมูลปนกัน — ขึ้นกับว่าตลาดให้ค่าแนวทาง research แค่ไหน',
      riskWarnings: [
        'ถ้าตลาดอ่อน ADA มักทรง/ย่อโดยไม่มี catalyst หนุน',
        'การยอมรับ DeFi ที่ช้าจำกัด upside ระยะกลาง',
      ],
      rationale: 'ADA ขับด้วย beta ตลาดเป็นหลัก หลักฐานดีมานด์จริงยังบาง รอ confirmation ช่วยเลี่ยง false move',
    },
    DOGE: {
      name: 'Dogecoin', sector: 'Meme · payments',
      stance: 'mixed', confidence: 50,
      brief: 'Dogecoin คือเหรียญ meme ที่มีสภาพคล่องและฐานแฟนใหญ่สุด ราคาถูกขับด้วย sentiment/กระแสโซเชียลและคนดังมากกว่าพื้นฐาน เคลื่อนไหวเป็น "ระเบิดตามกระแส" — upside เร็วแต่ย่อแรงพอกัน',
      observations: [
        'sentiment โซเชียล/คนดังคือตัวขับหลัก ไม่ใช่พื้นฐาน',
        'สภาพคล่องสูงสุดในกลุ่ม meme',
        'มักนำ/ขยายกระแส risk-on ของรายย่อย',
      ],
      setup: 'ราคาแกว่งกว้างตามกระแส รอแรงโซเชียลจุดชนวน',
      catalyst: 'ตัวเร่งคือกระแสโซเชียลและบรรยากาศ risk-on ของรายย่อย',
      positionNote: 'spot long ขนาดเล็กเชิงเก็งกระแส ตั้ง stop แน่น รับกำไรไว',
      dataQuality: 'พื้นฐานน้อย — สัญญาณส่วนใหญ่มาจาก sentiment ที่เปลี่ยนเร็ว',
      riskWarnings: [
        'ขับด้วยกระแสล้วน — ย่อแรงและเร็วเมื่อกระแสจบ',
        'ไม่มีพื้นฐานรองรับ ราคาลงได้ลึกในขาลง',
      ],
      rationale: 'DOGE เป็นการเก็งกระแสล้วนๆ เหมาะถือขนาดเล็กและคุมความเสี่ยงเข้ม ไม่ใช่สถานะหลัก',
    },
    AVAX: {
      name: 'Avalanche', sector: 'L1 · subnets สำหรับองค์กร',
      stance: 'mixed', confidence: 56,
      brief: 'Avalanche ชูจุดขาย subnets ที่ให้องค์กร/เกมสร้างเชนเฉพาะของตัวเองได้ เป็นเดิมพันธีม "สถาบัน/RWA บนเชน" จุดที่ต้องพิสูจน์คือการดึงผู้ใช้จริงและ TVL ให้แข่งกับ L1 อื่นได้',
      observations: [
        'การยอมรับ subnets โดยองค์กร/เกมคือตัวแปรชี้ขาด',
        'เป็นหนึ่งในเดิมพันธีม RWA/สถาบันบนเชน',
        'มักเป็น beta ของตลาดเมื่อยังไม่มี catalyst เฉพาะ',
      ],
      setup: 'ราคาพักฐาน รอสัญญาณยืนยันการเติบโตของ subnet/TVL',
      catalyst: 'ตัวเร่งคือดีล subnet องค์กรและการเติบโตของ TVL',
      positionNote: 'spot long ขนาดเล็ก เพิ่มเมื่อเห็นการยอมรับจริงชัดขึ้น',
      dataQuality: 'ข้อมูลปนกัน — story องค์กรยังต้องการหลักฐานการใช้งานจริง',
      riskWarnings: [
        'การแข่งขัน L1 ดุ — แย่ง TVL/ผู้ใช้ยาก',
        'ถ้าธีม RWA แผ่ว ราคาขาด catalyst เฉพาะตัว',
      ],
      rationale: 'AVAX ให้ upside ตามธีม subnet/RWA แต่หลักฐานยังต้องสะสม รอ confirmation ก่อนเพิ่มสถานะ',
    },
    LINK: {
      name: 'Chainlink', sector: 'Oracle · โครงสร้างพื้นฐาน',
      stance: 'bullish', confidence: 63,
      brief: 'Chainlink เป็นโครงสร้างพื้นฐาน oracle ที่ DeFi เกือบทุกเจ้าต้องพึ่งเพื่อดึงข้อมูลราคาเข้าเชน เป็นเดิมพัน "ขายจอบขายเสียม" ของวงการ บวกธีม CCIP/RWA ที่เชื่อมโลกการเงินดั้งเดิม จุดถกเถียงคือการแปลง utility เป็นมูลค่าโทเคนโดยตรง',
      observations: [
        'เป็นมาตรฐาน oracle ที่ DeFi พึ่งพิงสูง — มี moat ชัด',
        'CCIP/RWA คือขาโตที่เชื่อมการเงินดั้งเดิม',
        'มักวิ่งตามรอบ DeFi และความสนใจ RWA',
      ],
      setup: 'ราคายืนเหนือแนวรับ พยายามต่อขาขึ้นตามธีม RWA',
      catalyst: 'ตัวเร่งคือการยอมรับ CCIP/oracle และกระแส RWA',
      positionNote: 'spot long รับธีมโครงสร้างพื้นฐาน คุม stop ตามแนวรับ',
      dataQuality: 'การใช้งาน oracle ชัด แต่การส่งผ่านสู่มูลค่าโทเคนยังถกเถียง',
      riskWarnings: [
        'utility สูงไม่การันตีมูลค่าโทเคนโตตาม',
        'ถ้ารอบ DeFi อ่อน ดีมานด์ oracle ชะลอตาม',
      ],
      rationale: 'LINK เป็นเดิมพันโครงสร้างพื้นฐานที่มี moat โครงสร้าง LONG เหมาะเมื่อธีม DeFi/RWA ยังหนุน',
    },
    TON: {
      name: 'Toncoin', sector: 'L1 · ผูกกับ Telegram',
      stance: 'mixed', confidence: 54,
      brief: 'Toncoin ได้เปรียบจากการผูกกับ Telegram ที่มีผู้ใช้หลักพันล้าน เปิดทางสู่ผู้ใช้ใหม่จำนวนมากผ่าน mini-app/wallet ในแชต จุดที่ต้องพิสูจน์คือการเปลี่ยน "ผู้ใช้ Telegram" เป็น "ผู้ใช้ on-chain จริง" และความเสี่ยงที่ผูกกับแพลตฟอร์มเดียว',
      observations: [
        'ช่องทาง Telegram = ฐานผู้ใช้มหาศาลที่หา onboard ยากในที่อื่น',
        'การเติบโต mini-app/wallet ในแชตคือสัญญาณดีมานด์',
        'ความเสี่ยงผูกกับ Telegram (กฎหมาย/นโยบาย) เป็นตัวแปรเฉพาะ',
      ],
      setup: 'ราคาแกว่งในกรอบ รอสัญญาณการ onboard ผู้ใช้จริง',
      catalyst: 'ตัวเร่งคือการเติบโตของ mini-app/การใช้งานผ่าน Telegram',
      positionNote: 'spot long ขนาดเล็ก รับความเสี่ยงผูกแพลตฟอร์มเดียว',
      dataQuality: 'การเติบโตผู้ใช้น่าสนใจ แต่ conversion เป็น on-chain จริงยังต้องพิสูจน์',
      riskWarnings: [
        'พึ่ง Telegram สูง — ข่าวกฎหมาย/นโยบายแพลตฟอร์มกระทบตรง',
        'ผู้ใช้แชตจำนวนมากอาจไม่แปลงเป็นกิจกรรม on-chain ตามคาด',
      ],
      rationale: 'TON มี edge ด้านช่องทางผู้ใช้ที่หายาก แต่ความเสี่ยงผูกแพลตฟอร์มทำให้ควรถือขนาดเล็กก่อน',
    },
  };

  const normalize = (value) => String(value || '').trim().toUpperCase();
  const getBrief = (ticker) => BRIEFS[normalize(ticker)] || null;

  const api = { GENERATED_AT, BRIEFS, getBrief };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AnalysisClaude = api;
})(typeof window !== 'undefined' ? window : globalThis);
