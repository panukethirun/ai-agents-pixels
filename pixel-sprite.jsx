/* ===== Pixel sprite engine — renders a string pixel-map as CSS box-shadows ===== */

const SPRITE_PALETTE = {
  '.': null,
  'K': '#3a2412', // hair
  'F': '#f0c094', // face
  'f': '#d99e6b', // face shadow
  'E': '#26303a', // eyes
  'W': '#f3ead2', // collar
  'S': '#4f8a4e', // shirt
  's': '#356b3a', // shirt shadow
  'T': '#e7b53c', // tie
  'A': '#f0c094', // arms
  'P': '#33271a', // pants
  'O': '#1c130b', // shoes
  'H': '#2d2f38', // hair highlight
  'B': '#202128', // black suit
  'b': '#30333c', // suit highlight
  'C': '#dfe5e5', // cool white accessory
  'G': '#278f79', // green prop
  'g': '#1c6d63', // green prop shadow
  'M': '#e9958f', // mouth
};

const DUNGEON_PALETTE = {
  '.': null,
  'K': '#2b2018', // hair
  'F': '#f0c094', // face
  'f': '#c98254', // face shadow
  'E': '#161b22', // eyes
  'N': '#11151c', // black armor / cloth
  'n': '#2a303a', // armor highlight
  'M': '#c7d0d8', // blades / metal
  'm': '#6f7d89', // dark metal
  'G': '#e7b53c', // gold trim
  'R': '#7a1f2b', // dark cape
  'U': '#244d3a', // archer hood
  'u': '#173226', // archer shadow
  'L': '#6c4a2e', // leather
  'l': '#3e2b1d', // leather shadow
  'P': '#57338b', // wizard robe
  'p': '#38235f', // robe shadow
  'C': '#65e3ff', // magic
  'B': '#8a5a36', // bow / staff
  'b': '#d9c38a', // bow string
  'D': '#d7dde5', // dagger
  'O': '#17100c', // boots
};

// 13 wide x 16 tall — short hair
const TRADER_MAP = [
  '....KKKKK....',
  '...KKKKKKK...',
  '..KKKKKKKKK..',
  '..KFFFFFFFK..',
  '..KFFFFFFFK..',
  '..FFEFFFEFF..',
  '..FFFFFFFFF..',
  '..FfFFFFFfF..',
  '...WWSSSWW...',
  '..AsSSTSSsA..',
  '..ASSSTSSSA..',
  '..ASSSSSSSA..',
  '..AsSSSSSsA..',
  '...PPPPPPP...',
  '...PP..PP....',
  '...OO..OO....',
];

// 13 wide x 16 tall — long hair (to shoulders)
const TRADER_MAP_LONG = [
  '....KKKKK....',
  '...KKKKKKK...',
  '..KKKKKKKKK..',
  '.KKFFFFFFFKK.',
  '.KKFFFFFFFKK.',
  '.KFFEFFFEFFK.',
  '.KFFFFFFFFFK.',
  '.KFfFFFFFfFK.',
  '..KWWSSSWWK..',
  '..AsSSTSSsA..',
  '..ASSSTSSSA..',
  '..ASSSSSSSA..',
  '..AsSSSSSsA..',
  '...PPPPPPP...',
  '...PP..PP....',
  '...OO..OO....',
];

const CEO_WARRIOR_MAP = [
  '.....KKKKK.....',
  '....KKKKKKK....',
  '....KFFFFFK....',
  '....FFEFEFF....',
  '....FFFFFFF....',
  '.....FfFfF.....',
  '..M..NNNNN..M..',
  '.MMM.NGNGN.MMM.',
  '..M.NNNNNNN.M..',
  '....NNNGNNN....',
  '...RNNNNNNNR...',
  '....nnNNNnn....',
  '....NN...NN....',
  '....NO...ON....',
  '....OO...OO....',
  '...OO.....OO...',
];

const ARCHER_MAP = [
  '.....UUUUU.....',
  '....UUUUUUU....',
  '....UFFFFFU....',
  '....FFEFEFF....',
  '....FFFFFFF....',
  '.....FfFfF.....',
  '....LLLLLLL.B..',
  '...LlLLGLLl.B..',
  '...LLLLLLLL.B..',
  '....LLL.LLL.B..',
  '....LL...LL.B..',
  '....OO...OO.b..',
  '....OO...OO.b..',
  '...OO.....OO...',
  '............b..',
  '............B..',
];

const WIZARD_MAP = [
  '......P........',
  '.....PPP.......',
  '....PPPPP......',
  '....PFFFF......',
  '....FFEFE......',
  '....FFFFF..C...',
  '.....FfF...C...',
  '...PPPPPPP.B...',
  '..pPPPGPPPpB...',
  '...PPPPPPP.B...',
  '....PPPPP..B...',
  '....PP.PP..B...',
  '....OO.OO..B...',
  '...OO...OO.B...',
  '...........B...',
  '..........CCC..',
];

const THIEF_MAP = [
  '.....NNNNN.....',
  '....NNNNNNN....',
  '....NFFFFFN....',
  '....FFEFEFF....',
  '....FFFFFFF....',
  '.....FfFfF.....',
  '..D..NNNNN..D..',
  '...D.NnGnN.D...',
  '....NNNNNNN....',
  '....nNNNNn.....',
  '....NN.NN......',
  '....LL.LL......',
  '....LO.OL......',
  '....OO.OO......',
  '...OO...OO.....',
  '...............',
];

// 17 wide x 18 tall — Ping-CEO, messy black hair, monochrome fit, green prop
const PING_CEO_MAP = [
  '......KKKKK......',
  '....KKKKKKKKK....',
  '...KKKKKKKKKKK...',
  '..KKKKKKKKKKKKK..',
  '..KKKHHKKHHKKKK..',
  '.KKKFFFFFKKFKKK..',
  '.KKFFFFEFFFFEEKK.',
  '.KKFFFFFFFFFFFKK.',
  '..KFFfFFFFFfFFK..',
  '...KKFFFFMFFKK...',
  '..C.WWBBBBBWW.g..',
  '.CBCCWBBBBBWBgg..',
  '.CC.BBBBBBBBBGG..',
  '..A.BBBWBWBB.GG..',
  '....BBBBBBBBB.g..',
  '....BBOOBOOB.....',
  '....BB....BB.....',
  '....OO....OO.....',
];

// per-agent palette = base + overrides (hair K, shirt S/s, tie T)
function mkPalette(o){ return {...SPRITE_PALETTE, ...o}; }

const SAO_CHARACTER_RESOURCES = {
  kirito:  { name:'Kirito',  image:'assets/agents/sao/kirito.png',  frame:'assets/agents/sao/frames/kirito.png',  sheet:'assets/agents/sao/sao-character-sheet.png' },
  asuna:   { name:'Asuna',   image:'assets/agents/sao/asuna.png',   frame:'assets/agents/sao/frames/asuna.png',   sheet:'assets/agents/sao/sao-character-sheet.png' },
  alice:   { name:'Alice',   image:'assets/agents/sao/alice.png',   frame:'assets/agents/sao/frames/alice.png',   sheet:'assets/agents/sao/sao-character-sheet.png' },
  eugeo:   { name:'Eugeo',   image:'assets/agents/sao/eugeo.png',   frame:'assets/agents/sao/frames/eugeo.png',   sheet:'assets/agents/sao/sao-character-sheet.png' },
  klein:   { name:'Klein',   image:'assets/agents/sao/klein.png',   frame:'assets/agents/sao/frames/klein.png',   sheet:'assets/agents/sao/sao-character-sheet.png' },
  lisbeth: { name:'Lisbeth', image:'assets/agents/sao/lisbeth.png', frame:'assets/agents/sao/frames/lisbeth.png', sheet:'assets/agents/sao/sao-character-sheet.png' },
  yui:     { name:'Yui',     image:'assets/agents/sao/yui.png',     frame:'assets/agents/sao/frames/yui.png',     sheet:'assets/agents/sao/sao-character-sheet.png' },
  silica:  { name:'Silica',  image:'assets/agents/sao/silica.png',  frame:'assets/agents/sao/frames/silica.png',  sheet:'assets/agents/sao/sao-character-sheet.png' },
  sinon:   { name:'Sinon',   image:'assets/agents/sao/sinon.png',   frame:'assets/agents/sao/frames/sinon.png',   sheet:'assets/agents/sao/sao-character-sheet.png' },
  agil:    { name:'Agil',    image:'assets/agents/sao/agil.png',    frame:'assets/agents/sao/frames/agil.png',    sheet:'assets/agents/sao/sao-character-sheet.png' },
};

// ชุดตัวละครใหม่ (sao2) — ภาพอยู่ใน assets/agents/sao2/ ใช้ bubble frame เดิมจาก sao
const SAO2_CHARACTER_RESOURCES = {
  kirito:  { name:'Kirito',  image:'assets/agents/sao2/kirito.png',  frame:'assets/agents/sao/frames/kirito.png' },
  asuna:   { name:'Asuna',   image:'assets/agents/sao2/asuna.png',   frame:'assets/agents/sao/frames/asuna.png' },
  alice:   { name:'Alice',   image:'assets/agents/sao2/alice.png',   frame:'assets/agents/sao/frames/alice.png' },
  eugeo:   { name:'Eugeo',   image:'assets/agents/sao2/eugeo.png',   frame:'assets/agents/sao/frames/eugeo.png' },
  klein:   { name:'Klein',   image:'assets/agents/sao2/klein.png',   frame:'assets/agents/sao/frames/klein.png' },
  lisbeth: { name:'Lisbeth', image:'assets/agents/sao2/lisbeth.png', frame:'assets/agents/sao/frames/lisbeth.png' },
  yui:     { name:'Yui',     image:'assets/agents/sao2/yui.png',     frame:'assets/agents/sao/frames/yui.png' },
  silica:  { name:'Silica',  image:'assets/agents/sao2/silica.png',  frame:'assets/agents/sao/frames/silica.png' },
  sinon:   { name:'Sinon',   image:'assets/agents/sao2/sinon.png',   frame:'assets/agents/sao/frames/sinon.png' },
  agil:    { name:'Agil',    image:'assets/agents/sao2/agil.png',    frame:'assets/agents/sao/frames/agil.png' },
};

// เลือกชุดตัวละครที่ใช้งาน — เปลี่ยนเป็น 'sao' เพื่อกลับไปใช้ชุดเดิม
const AGENT_SETS = { sao: SAO_CHARACTER_RESOURCES, sao2: SAO2_CHARACTER_RESOURCES };
const ACTIVE_AGENT_SET = 'sao2';
const RES = AGENT_SETS[ACTIVE_AGENT_SET] || SAO_CHARACTER_RESOURCES;

// บทพูดตัวละคร (MoonSignal x SAO) — เก็บครบ 10 ตัวเผื่อเพิ่ม agent ภายหลัง
const VOICE_SCRIPTS = {
  kirito: [
    'พร้อมเข้าระบบแล้ว ไปเริ่มภารกิจกันเถอะ',
    'ถ้าทางข้างหน้ามืด ฉันจะเป็นคนเปิดทางเอง',
    'ดาบเล่มนี้ไม่ได้มีไว้โชว์ แต่มีไว้ปกป้องทีม',
    'ระวังรอบตัวไว้ โลกเสมือนจริงก็มีอันตรายจริงได้เหมือนกัน',
    'ถ้าเชื่อใจกัน เราจะผ่านด่านนี้ได้',
    'อย่าฝืนคนเดียว เรียกฉันได้เสมอ',
    'สัญญาณมาแล้ว เตรียมวิเคราะห์ MoonSignal',
    'ศัตรูอาจเร็ว แต่เราต้องเร็วกว่าหนึ่งก้าว',
    'วันนี้ล็อบบี้ดูสงบดี เหมาะกับการวางแผน',
    'ไปกันเถอะ เป้าหมายของเราอยู่เหนือเมฆนั้น',
  ],
  asuna: [
    'ทุกคนพร้อมนะคะ เริ่มประชุมภารกิจได้เลย',
    'อย่าลืมพักด้วยนะ การต่อสู้นานเกินไปทำให้พลาดง่าย',
    'ฉันจะคอยดูแนวหลังเอง ไม่ต้องห่วง',
    'ข้อมูลบนจอแสดงผลชัดเจนดี เราตัดสินใจได้เร็วขึ้น',
    'ถ้าเราจัดทีมดี โอกาสชนะจะสูงมาก',
    'แผนที่ดีต้องมีทั้งความเร็วและความปลอดภัย',
    'วันนี้ขอให้ทุกคนกลับมาที่ล็อบบี้อย่างปลอดภัยนะ',
    'ฉันเชื่อในทีมนี้เสมอ',
    'สัญญาณเปลี่ยนแล้ว รีบปรับกลยุทธ์กันเถอะ',
    'ต่อให้เป็นโลกเสมือนจริง ความรู้สึกของเราก็เป็นของจริง',
  ],
  alice: [
    'ข้าจะยืนหยัดในฐานะอัศวินของทีมนี้',
    'แสงแห่งความกล้าจะนำทางเราไปสู่ชั้นถัดไป',
    'อย่าให้ความกลัวควบคุมดาบของเจ้า',
    'ห้องแห่งนี้งดงาม สมกับเป็นฐานบัญชาการบนท้องฟ้า',
    'หากมีภัยเข้ามา ข้าจะเป็นปราการแรก',
    'เกียรติของนักรบคือการปกป้องผู้ที่อยู่ข้างหลัง',
    'ข้อมูลที่ชัดเจนคืออาวุธอีกชนิดหนึ่ง',
    'จงเตรียมใจให้มั่น ก่อนก้าวผ่านประตูเคลื่อนย้าย',
    'ความแข็งแกร่งที่แท้จริง เริ่มจากการไม่ทอดทิ้งกัน',
    'ข้าพร้อมแล้ว จงออกคำสั่งมา',
  ],
  eugeo: [
    'ถ้าทุกคนไปด้วยกัน ผมก็พร้อมครับ',
    'ดาบของผมอาจยังไม่สมบูรณ์ แต่ใจผมมั่นคง',
    'ล็อบบี้นี้มองเห็น Aincrad ชัดมากเลยนะ',
    'ผมจะคอยสนับสนุนจากด้านข้างเอง',
    'อย่ารีบเกินไปนะครับ เช็กข้อมูลก่อนดีที่สุด',
    'ความเชื่อใจคือพลังที่ทำให้ทีมเดินต่อได้',
    'สัญญาณนี้ดูน่าสนใจ เราควรบันทึกไว้',
    'ผมจะไม่ยอมให้ใครต้องสู้ลำพัง',
    'ต่อให้เป็นภารกิจเล็ก เราก็ควรทำให้ดีที่สุด',
    'พร้อมออกเดินทางครับ',
  ],
  sinon: [
    'เป้าหมายล็อกแล้ว รอคำสั่งยิง',
    'ฉันจะคอยดูระยะไกลให้เอง',
    'อย่าเดินเป็นเส้นตรง ศัตรูอ่านทางง่าย',
    'ข้อมูลบนหน้าจอมีความผันผวน ต้องเช็กซ้ำ',
    'ใจเย็นไว้ การยิงที่แม่นเริ่มจากลมหายใจที่นิ่ง',
    'ถ้าสัญญาณหลอกมา เราต้องรู้ทันก่อนโดนเล่นงาน',
    'ฉันไม่ชอบเสี่ยงโดยไม่มีแผน',
    'ระยะปลอดภัยพร้อมแล้ว เคลื่อนที่ได้',
    'ความกลัวไม่ได้หายไป แต่เราควบคุมมันได้',
    'ภารกิจนี้ฉันจะครอบคลุมให้ทุกมุม',
  ],
  leafa: [
    'ให้ฉันช่วยตรวจเส้นทางบนฟ้านะ',
    'ลมวันนี้ดีมาก เหมาะกับการออกสำรวจ',
    'ถ้าเหนื่อยก็พักก่อนค่ะ ทีมไม่จำเป็นต้องรีบเสมอไป',
    'พื้นที่สีเขียวในล็อบบี้ช่วยให้ใจสงบขึ้นเยอะเลย',
    'ฉันจะคอยสนับสนุนการเคลื่อนที่ของทุกคน',
    'อย่าลืมมองมุมสูง บางทีคำตอบอยู่เหนือเรา',
    'สัญญาณนี้เหมือนลมเปลี่ยนทิศ ต้องระวังค่ะ',
    'ไปด้วยกันนะ ฉันจะไม่ทิ้งใครไว้ข้างหลัง',
    'ท้องฟ้ากว้างขนาดนี้ ยังมีอะไรให้ค้นหาอีกมาก',
    'พร้อมบินเมื่อไหร่ก็บอกได้เลย',
  ],
  lisbeth: [
    'อุปกรณ์พร้อมใช้งานแล้ว ใครอยากอัปเกรดมาหาฉันได้',
    'อย่าดูถูกค้อนนะ มันซ่อมได้ทั้งของและสถานการณ์',
    'จอฝั่งขวาเหมือนต้องคาลิเบรตใหม่ เดี๋ยวฉันจัดการเอง',
    'ดาบดีช่วยได้ แต่คนใช้ต้องดีกว่าดาบ',
    'ถ้ามีไอเทมเสีย เอามาวางที่โต๊ะช่างได้เลย',
    'ฉันทำของให้แข็งแรงได้ แต่ใจต้องแข็งแรงเองนะ',
    'สัญญาณนี้ต้องตีความดี ๆ ไม่งั้นพลาดแน่',
    'เฮ้ อย่าทำโต๊ะเวิร์กสเตชันรกนักสิ',
    'ทีมที่ดีต้องมีทั้งนักสู้และคนซ่อมเบื้องหลัง',
    'เอาล่ะ งานช่างเสร็จแล้ว ไปลองของกัน',
  ],
  silica: [
    'วันนี้ทุกคนดูพร้อมมากเลยค่ะ',
    'ขอให้ภารกิจนี้ผ่านแบบปลอดภัยนะคะ',
    'เจ้ามังกรน้อยบอกว่าสัญญาณทางซ้ายแปลก ๆ ค่ะ',
    'ฉันจะคอยช่วยเก็บข้อมูลเล็ก ๆ ให้เอง',
    'ถึงฉันจะตัวเล็ก แต่ก็ช่วยทีมได้แน่นอนค่ะ',
    'ล็อบบี้นี้น่ารักมาก เหมือนฐานลับบนเมฆเลย',
    'ถ้ามีใครบาดเจ็บ รีบกลับมาหาฉันนะคะ',
    'อย่าลืมยิ้มก่อนเริ่มภารกิจนะคะ',
    'บางครั้งคำตอบสำคัญก็ซ่อนอยู่ในรายละเอียดเล็ก ๆ',
    'พร้อมแล้วค่ะ ไปกันเลย',
  ],
  klein: [
    'เอาล่ะพวกเรา ได้เวลาโชว์ทีมเวิร์กแล้ว',
    'ไม่ต้องห่วง ฉันคุมบรรยากาศให้เอง',
    'ศัตรูมาเมื่อไหร่ เรียกชื่อฉันดัง ๆ ได้เลย',
    'เฮ้ ล็อบบี้นี้เท่ชะมัด เหมาะกับกิลด์ระดับตำนาน',
    'แผนดีแล้ว แต่ขอเพิ่มความกล้าเข้าไปอีกหน่อย',
    'ถ้าใครเครียด เดี๋ยวฉันเลี้ยงน้ำหลังจบภารกิจ',
    'สัญญาณแรงแบบนี้ ต้องมีอะไรเกิดขึ้นแน่',
    'ดาบพร้อม ใจพร้อม ทีมพร้อม ลุยได้',
    'แพ้ไม่เป็นไร แต่อย่าหนีจากเพื่อนก็พอ',
    'ไปกันเถอะ วันนี้เราจะทำให้ MoonSignal ดังทั้ง Aincrad',
  ],
  yuuki: [
    'สนุกดีนะ ได้ยืนอยู่ตรงนี้กับทุกคน',
    'ถ้ามีโอกาสแค่ครั้งเดียว ก็ต้องใช้ให้ดีที่สุด',
    'ฉันชอบสัญญาณที่ท้าทาย มันทำให้หัวใจเต้นแรง',
    'ไม่ต้องคิดมากเกินไป บางครั้งต้องก้าวไปก่อน',
    'ความเร็วสำคัญ แต่รอยยิ้มก็สำคัญเหมือนกัน',
    'ถ้าทีมนี้ยังหัวเราะได้ เราก็ยังสู้ต่อได้',
    'ฉันจะเปิดจังหวะให้เอง ตามมาให้ทันนะ',
    'โลกนี้สวยมาก เพราะมีคนสำคัญอยู่ในนั้น',
    'อย่ากลัวการเริ่มใหม่ ทุกการเริ่มต้นมีพลังของมัน',
    'พร้อมแล้ว ไปสร้างตำนานบทใหม่กันเถอะ',
  ],
};

// the team roster — RPG classes for the dungeon dashboard
const AGENTS = [
  { id:'a1', name:'Ping-CEO', role:'Kirito', tint:'#2d9b86', map:PING_CEO_MAP, voice:'kirito',
    resource:RES.kirito, image:RES.kirito.image, bubbleFrame:RES.kirito.frame,
    standingBubble:'Watching BTC...',
    bubbleLift:120,
    bubbleOffsetX:0,
    palette:mkPalette({
      K:'#171820', H:'#2f323c', F:'#ffd9bd', f:'#f0a08f', E:'#151923',
      W:'#f0efe6', B:'#1e2028', b:'#30333c', C:'#dfe5e5',
      G:'#2c9b84', g:'#1e6f63', M:'#e9958f', A:'#ffd0b2', O:'#101217'
    }) },
  { id:'a2', name:'Asuna',  role:'Asuna', tint:'#d85a62', map:ARCHER_MAP, voice:'asuna',
    resource:RES.asuna, image:RES.asuna.image, bubbleFrame:RES.asuna.frame,
    standingBubble:'Holding center...',
    bubbleLift:138,
    bubbleOffsetX:30,
    palette:mkPalette({...DUNGEON_PALETTE, U:'#2f6b4e', u:'#1f4634'}) },
  { id:'a3', name:'Alice', role:'Alice', tint:'#e7b53c', map:WIZARD_MAP, voice:'alice',
    resource:RES.alice, image:RES.alice.image, bubbleFrame:RES.alice.frame,
    standingBubble:'Quest board ready...',
    bubbleLift:120,
    bubbleOffsetX:0,
    palette:mkPalette({...DUNGEON_PALETTE, K:'#4a351f', P:'#6740a8', p:'#3c286d', C:'#65e3ff'}) },
  { id:'a4', name:'Eugeo', role:'Eugeo', tint:'#65e3ff', map:THIEF_MAP, voice:'eugeo',
    resource:RES.eugeo, image:RES.eugeo.image, bubbleFrame:RES.eugeo.frame,
    standingBubble:'Trading post clear...',
    bubbleLift:110,
    bubbleOffsetX:18,
    palette:mkPalette({...DUNGEON_PALETTE, N:'#171b24', n:'#303847', G:'#caa84b'}) },
  { id:'a5', name:'Sinon', role:'DeepSeek Signal Scorer', tint:'#65e3ff', map:ARCHER_MAP, voice:'sinon',
    resource:RES.sinon, image:RES.sinon.image, bubbleFrame:RES.sinon.frame,
    standingBubble:'DeepSeek ready...',
    bubbleLift:110,
    bubbleOffsetX:-16,
    palette:mkPalette({...DUNGEON_PALETTE, U:'#245f73', u:'#163947', G:'#8ee7ff'}) },
];

// build a box-shadow string from a pixel map
function buildShadows(map, scale, palette){
  const parts = [];
  for(let r=0;r<map.length;r++){
    const row = map[r];
    for(let c=0;c<row.length;c++){
      const col = palette[row[c]];
      if(!col) continue;
      parts.push(`${c*scale}px ${r*scale}px 0 0 ${col}`);
    }
  }
  return parts.join(',');
}

function PixelSprite({map, scale=4, palette=SPRITE_PALETTE, flip=false, className=''}){
  const cols = map[0].length, rows = map.length;
  const shadow = React.useMemo(()=>buildShadows(map, scale, palette), [map, scale, palette]);
  return (
    <div className={'sprite '+className}
      style={{width:cols*scale, height:rows*scale, transform: flip?'scaleX(-1)':'none'}}>
      <div className="px" style={{'--s':scale+'px', width:scale, height:scale, boxShadow:shadow}} />
    </div>
  );
}

function ImageSprite({src, map, scale=3, palette=SPRITE_PALETTE, flip=false, className=''}){
  const [broken,setBroken] = React.useState(false);
  if(!src || broken) return <PixelSprite map={map||TRADER_MAP} scale={scale} flip={flip} palette={palette} className={className} />;
  return (
    <span className={'sprite-img-wrap '+className}
      style={{height:(scale*26)+'px', transform: flip?'scaleX(-1)':'none'}}>
      <img className="sprite-img base" src={src} alt="" onError={()=>setBroken(true)} />
    </span>
  );
}

// a single walking agent (positioned by parent via left/top %)
function Agent({a, scale=3, showName, z, onAction, onBubble}){
  const bubbleStyle = {
    ...(a.bubbleLift ? {bottom:a.bubbleLift+'%'} : {}),
    ...(a.bubbleOffsetX ? {'--bubble-x':a.bubbleOffsetX+'px'} : {}),
    ...(a.bubbleFrame ? {'--bubble-frame':`url(${a.bubbleFrame})`} : {}),
  };
  return (
    <div className={'agent'+(a.walking?' walking':'')}
      style={{left:a.pos.x+'%', top:a.pos.y+'%', zIndex:z, marginLeft:(a.nudgeX||0)+'px', marginTop:(a.nudgeY||0)+'px'}}>
      {a.bubble && <button className={'bubble'+(a.bubbleFrame?' framed':'')+(a.bubbleAction?' actionable':'')} type="button"
        style={bubbleStyle} disabled={!a.bubbleAction}
        onClick={(e)=>{ e.stopPropagation(); if(a.bubbleAction) onBubble && onBubble(a); }}>
        {a.bubble}
      </button>}
      {a.actionLabel && <button className="agent-action btn" type="button" title={a.actionTitle || a.actionLabel}
        disabled={a.actionBusy} onClick={(e)=>{ e.stopPropagation(); onAction && onAction(a); }}>
        {a.actionBusy ? 'Asking...' : a.actionLabel}
      </button>}
      <div className="shadow" />
      <div className="bobber">
        <ImageSprite src={a.image} map={a.map||TRADER_MAP} scale={scale} flip={a.flip} palette={a.palette||SPRITE_PALETTE} />
      </div>
      {showName && <div className="name-tag" style={{borderColor:a.tint}}>{a.name}</div>}
    </div>
  );
}

// small head-only avatar (sidebar / roster)
function MiniFace({palette=SPRITE_PALETTE, map=TRADER_MAP, image, scale=4}){
  const [broken,setBroken] = React.useState(false);
  if(image && !broken) return <img className="mini-sprite-img" src={image} alt="" onError={()=>setBroken(true)} />;
  const head = map.slice(0,8);
  return <PixelSprite map={head} scale={scale} palette={palette} />;
}
function AvatarFace({scale=4}){ return <MiniFace map={AGENTS[0].map} palette={AGENTS[0].palette} image={AGENTS[0].image} scale={scale} />; }

Object.assign(window, {
  PixelSprite, ImageSprite, Agent, MiniFace, AvatarFace,
  TRADER_MAP, TRADER_MAP_LONG, CEO_WARRIOR_MAP, ARCHER_MAP, WIZARD_MAP, THIEF_MAP, PING_CEO_MAP,
  SPRITE_PALETTE, DUNGEON_PALETTE, SAO_CHARACTER_RESOURCES, SAO2_CHARACTER_RESOURCES,
  AGENT_SETS, ACTIVE_AGENT_SET, VOICE_SCRIPTS, AGENTS
});
