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

// per-agent palette = base + overrides (hair K, shirt S/s, tie T)
function mkPalette(o){ return {...SPRITE_PALETTE, ...o}; }

// the team roster — RPG classes for the dungeon dashboard
const AGENTS = [
  { id:'a1', name:'Ping', role:'CEO Warrior', tint:'#e7b53c', map:CEO_WARRIOR_MAP,
    palette:mkPalette(DUNGEON_PALETTE) },
  { id:'a2', name:'Joe',  role:'Archer', tint:'#58b87a', map:ARCHER_MAP,
    palette:mkPalette({...DUNGEON_PALETTE, U:'#2f6b4e', u:'#1f4634'}) },
  { id:'a3', name:'Mali', role:'Wizard', tint:'#8a66d9', map:WIZARD_MAP,
    palette:mkPalette({...DUNGEON_PALETTE, K:'#4a351f', P:'#6740a8', p:'#3c286d', C:'#65e3ff'}) },
  { id:'a4', name:'Dex', role:'Thief', tint:'#6f7d89', map:THIEF_MAP,
    palette:mkPalette({...DUNGEON_PALETTE, N:'#171b24', n:'#303847', G:'#caa84b'}) },
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

// a single walking agent (positioned by parent via left/top %)
function Agent({a, scale=3, showName, z}){
  return (
    <div className={'agent'+(a.walking?' walking':'')}
      style={{left:a.pos.x+'%', top:a.pos.y+'%', zIndex:z}}>
      {a.bubble && <div className="bubble">{a.bubble}</div>}
      <div className="shadow" />
      <div className="bobber">
        <PixelSprite map={a.map||TRADER_MAP} scale={scale} flip={a.flip} palette={a.palette||SPRITE_PALETTE} />
      </div>
      {showName && <div className="name-tag" style={{borderColor:a.tint}}>{a.name}</div>}
    </div>
  );
}

// small head-only avatar (sidebar / roster)
function MiniFace({palette=SPRITE_PALETTE, map=TRADER_MAP, scale=4}){
  const head = map.slice(0,8);
  return <PixelSprite map={head} scale={scale} palette={palette} />;
}
function AvatarFace({scale=4}){ return <MiniFace map={CEO_WARRIOR_MAP} palette={mkPalette(DUNGEON_PALETTE)} scale={scale} />; }

Object.assign(window, {
  PixelSprite, Agent, MiniFace, AvatarFace,
  TRADER_MAP, TRADER_MAP_LONG, CEO_WARRIOR_MAP, ARCHER_MAP, WIZARD_MAP, THIEF_MAP,
  SPRITE_PALETTE, DUNGEON_PALETTE, AGENTS
});
