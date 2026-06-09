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

// the team roster — RPG classes for the dungeon dashboard
const AGENTS = [
  { id:'a1', name:'Ping-CEO', role:'Kirito', tint:'#2d9b86', map:PING_CEO_MAP,
    resource:SAO_CHARACTER_RESOURCES.kirito, image:SAO_CHARACTER_RESOURCES.kirito.image, bubbleFrame:SAO_CHARACTER_RESOURCES.kirito.frame,
    standingBubble:'Watching BTC...',
    bubbleLift:122,
    bubbleOffsetX:-34,
    palette:mkPalette({
      K:'#171820', H:'#2f323c', F:'#ffd9bd', f:'#f0a08f', E:'#151923',
      W:'#f0efe6', B:'#1e2028', b:'#30333c', C:'#dfe5e5',
      G:'#2c9b84', g:'#1e6f63', M:'#e9958f', A:'#ffd0b2', O:'#101217'
    }) },
  { id:'a2', name:'Asuna',  role:'Asuna', tint:'#d85a62', map:ARCHER_MAP,
    resource:SAO_CHARACTER_RESOURCES.asuna, image:SAO_CHARACTER_RESOURCES.asuna.image, bubbleFrame:SAO_CHARACTER_RESOURCES.asuna.frame,
    standingBubble:'Holding center...',
    bubbleLift:148,
    bubbleOffsetX:38,
    palette:mkPalette({...DUNGEON_PALETTE, U:'#2f6b4e', u:'#1f4634'}) },
  { id:'a3', name:'Alice', role:'Alice', tint:'#e7b53c', map:WIZARD_MAP,
    resource:SAO_CHARACTER_RESOURCES.alice, image:SAO_CHARACTER_RESOURCES.alice.image, bubbleFrame:SAO_CHARACTER_RESOURCES.alice.frame,
    standingBubble:'Quest board ready...',
    bubbleLift:120,
    bubbleOffsetX:4,
    palette:mkPalette({...DUNGEON_PALETTE, K:'#4a351f', P:'#6740a8', p:'#3c286d', C:'#65e3ff'}) },
  { id:'a4', name:'Eugeo', role:'Eugeo', tint:'#65e3ff', map:THIEF_MAP,
    resource:SAO_CHARACTER_RESOURCES.eugeo, image:SAO_CHARACTER_RESOURCES.eugeo.image, bubbleFrame:SAO_CHARACTER_RESOURCES.eugeo.frame,
    standingBubble:'Trading post clear...',
    bubbleLift:120,
    bubbleOffsetX:-4,
    palette:mkPalette({...DUNGEON_PALETTE, N:'#171b24', n:'#303847', G:'#caa84b'}) },
  { id:'a5', name:'Sinon', role:'DeepSeek Signal Scorer', tint:'#65e3ff', map:ARCHER_MAP,
    resource:SAO_CHARACTER_RESOURCES.sinon, image:SAO_CHARACTER_RESOURCES.sinon.image, bubbleFrame:SAO_CHARACTER_RESOURCES.sinon.frame,
    standingBubble:'DeepSeek ready...',
    bubbleLift:128,
    bubbleOffsetX:-10,
    actionLabel:'Send',
    actionTitle:'Send calculated BTCUSDT feature JSON to DeepSeek for signal scoring and risk check',
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
function Agent({a, scale=3, showName, z, onAction}){
  const bubbleStyle = {
    ...(a.bubbleLift ? {bottom:a.bubbleLift+'%'} : {}),
    ...(a.bubbleOffsetX ? {'--bubble-x':a.bubbleOffsetX+'px'} : {}),
    ...(a.bubbleFrame ? {'--bubble-frame':`url(${a.bubbleFrame})`} : {}),
  };
  return (
    <div className={'agent'+(a.walking?' walking':'')}
      style={{left:a.pos.x+'%', top:a.pos.y+'%', zIndex:z, marginLeft:(a.nudgeX||0)+'px'}}>
      {a.bubble && <div className={'bubble'+(a.bubbleFrame?' framed':'')} style={bubbleStyle}>{a.bubble}</div>}
      {a.actionLabel && <button className="agent-action btn" type="button" title={a.actionTitle || a.actionLabel}
        disabled={a.actionBusy} onClick={(e)=>{ e.stopPropagation(); onAction && onAction(a); }}>
        {a.actionBusy ? 'Sending...' : a.actionLabel}
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
  SPRITE_PALETTE, DUNGEON_PALETTE, SAO_CHARACTER_RESOURCES, AGENTS
});
