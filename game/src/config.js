// VELVET HOUR — configuration: canvas, palette, tools and the five heist rooms.
// Every room is data: walls, shadows, patrols, cameras, lasers, loot and the exit.
// Coordinates are full-canvas pixels; the play area is y >= HUD (54) inside the border.
export const VIEW = { width: 960, height: 600, hud: 54, border: 8 };

export const PALETTE = {
  page: '#070812',
  floorA: '#191b31',
  floorB: '#151729',
  floorEdge: '#23264a',
  wall: '#2e3157',
  wallTop: '#4a4e8f',
  door: '#6b5a2e',
  doorTop: '#a8894a',
  shadow: 'rgba(2, 3, 12, 0.62)',
  lightPool: 'rgba(255, 196, 96, 0.10)',
  coneGuard: 'rgba(255, 214, 92, 0.42)',
  coneGuardEdge: 'rgba(255, 214, 92, 0.8)',
  coneCamera: 'rgba(255, 92, 92, 0.36)',
  coneCameraEdge: 'rgba(255, 120, 120, 0.75)',
  laser: '#ff5470',
  thief: '#f2ede2',
  thiefCloak: '#23233f',
  guard: '#3d5a3a',
  guardTrim: '#c8d6a0',
  camera: '#8a8fa8',
  loot: '#ffd76a',
  lootMain: '#ffec9e',
  exit: '#7fe0a8',
  alarm: '#ff4d5e',
  noise: '#7fd4ff',
  smoke: 'rgba(200, 205, 220, 0.35)',
  text: '#ece7da',
  dim: '#9a94b8',
  gold: '#e8c268',
};

export const TUNING = {
  walkSpeed: 145,
  runSpeed: 235,
  guardCatchDistance: 26,
  alarmSeenGuard: 30,
  alarmSeenCamera: 15,
  alarmLaser: 45,
  alarmDecay: 11,
  shadowRangeFactor: 0.55,
  shadowAlarmFactor: 0.5,
  noiseRunRadius: 130,
  noiseRunInterval: 0.35,
  noiseDecoyRadius: 230,
  smokeRadius: 190,
  smokeSeconds: 3,
  doorChannelSeconds: 3,
  investigateSeconds: 3.2,
};

export const TOOLS = {
  smoke: { name: 'Smoke Bomb', cost: 2, key: '1', blurb: 'Blinds every cone near you for 3 seconds.' },
  decoy: { name: 'Decoy Coin', cost: 1, key: '2', blurb: 'Click to toss: guards walk to the sound.' },
  pick: { name: 'Lockpick', cost: 2, key: '3', blurb: 'Locked doors open instantly on touch.' },
};

// Room helper: a guard patrol is waypoints the guard walks between, pausing to sweep.
function guard(patrol, speed = 62, range = 178, halfAngle = 0.62) {
  return { patrol, speed, range, halfAngle, pause: 1.2 };
}
// A camera sweeps its cone around baseAngle by +/- sweep radians over `period` seconds.
function camera(x, y, baseAngle, sweep = 0.7, period = 5, range = 205, halfAngle = 0.5) {
  return { x, y, baseAngle, sweep, period, range, halfAngle };
}
function loot(x, y, name, value, main = false) {
  return { x, y, name, value, main };
}
function wall(x, y, w, h) {
  return { x, y, w, h };
}
function shade(x, y, w, h) {
  return { x, y, w, h };
}
function laser(horizontal, fixed, from, to, period, phase = 0) {
  return { horizontal, fixed, from, to, period, phase };
}
function door(x, y, w, h) {
  return { x, y, w, h, locked: true };
}

export const HEISTS = [
  {
    name: 'The Gallery After Dark',
    sub: 'Meridian Museum of Art — Wing B',
    target: 'The Starlit Madonna',
    par: 150,
    start: { x: 82, y: 500 },
    exit: { x: 884, y: 96, w: 46, h: 46 },
    walls: [
      wall(300, 200, 130, 26), wall(300, 380, 130, 26),
      wall(560, 290, 26, 130), wall(150, 150, 26, 120),
    ],
    shadows: [
      shade(24, 120, 90, 300), shade(320, 420, 220, 90), shade(640, 120, 120, 110),
    ],
    guards: [
      guard([[240, 300], [700, 300], [700, 470], [240, 470]]),
      guard([[620, 140], [860, 140], [860, 300], [620, 300]], 56),
    ],
    cameras: [camera(940, 70, Math.PI * 0.75, 0.6, 5.5)],
    lasers: [],
    doors: [],
    loot: [
      loot(365, 160, 'Porcelain Vase', 40),
      loot(720, 480, 'Bronze Hare', 55),
      loot(880, 500, 'The Starlit Madonna', 150, true),
    ],
  },
  {
    name: "The Banker's Study",
    sub: 'Halden & Cross Private Bank — 4th Floor',
    target: 'The Halden Ledger',
    par: 170,
    start: { x: 82, y: 500 },
    exit: { x: 884, y: 500, w: 46, h: 46 },
    walls: [
      wall(200, 130, 26, 200), wall(200, 400, 26, 120),
      wall(430, 130, 26, 120), wall(430, 330, 26, 190),
      wall(660, 200, 26, 190), wall(560, 460, 140, 26),
    ],
    shadows: [
      shade(24, 130, 90, 180), shade(250, 380, 130, 110), shade(700, 120, 120, 130), shade(480, 130, 130, 80),
    ],
    guards: [
      guard([[150, 180], [150, 480], [330, 480], [330, 180]]),
      guard([[520, 200], [750, 200], [750, 420], [520, 420]], 58),
      guard([[800, 150], [890, 150], [890, 430], [800, 430]], 66),
    ],
    cameras: [camera(20, 70, 0.5, 0.6, 6), camera(940, 70, Math.PI * 0.8, 0.55, 4.5)],
    lasers: [],
    doors: [door(430, 250, 26, 80)],
    loot: [
      loot(300, 160, 'Silver Inkwell', 45),
      loot(580, 160, 'Ivory Chess Set', 60),
      loot(760, 500, 'Emerald Paperweight', 70),
      loot(880, 140, 'The Halden Ledger', 160, true),
    ],
  },
  {
    name: 'The Meridian Vault',
    sub: 'Meridian Trust — Sub-Basement Two',
    target: 'The Meridian Diamond',
    par: 200,
    start: { x: 82, y: 320 },
    exit: { x: 82, y: 96, w: 46, h: 46 },
    walls: [
      wall(330, 120, 300, 26), wall(330, 480, 300, 26),
      wall(330, 146, 26, 334), wall(604, 146, 26, 140), wall(604, 366, 26, 114),
      wall(180, 240, 90, 26), wall(700, 240, 90, 26), wall(700, 420, 90, 26),
    ],
    shadows: [
      shade(24, 140, 100, 130), shade(24, 400, 100, 120), shade(680, 300, 130, 90), shade(380, 300, 170, 90),
    ],
    guards: [
      guard([[150, 150], [150, 500], [280, 500], [280, 150]]),
      guard([[700, 150], [880, 150], [880, 500], [700, 500]], 60),
      guard([[380, 200], [580, 200], [580, 420], [380, 420]], 54),
      guard([[480, 540], [820, 540], [820, 300], [480, 300]], 68),
    ],
    cameras: [
      camera(20, 70, 0.6, 0.5, 5),
      camera(940, 70, Math.PI * 0.75, 0.5, 4),
      camera(480, 585, -Math.PI / 2, 0.6, 6),
    ],
    lasers: [
      laser(true, 0, 330, 480, 7, 0),
      laser(false, 0, 660, 820, 8, 0.5),
    ],
    doors: [door(604, 286, 26, 80)],
    loot: [
      loot(230, 150, 'Gold Bar', 60),
      loot(840, 150, 'Sapphire Tiara', 80),
      loot(840, 500, 'Ruby Signet', 70),
      loot(480, 320, 'The Meridian Diamond', 220, true),
      loot(230, 500, 'Pearl Strand', 55),
    ],
  },
  {
    name: 'The Penthouse',
    sub: 'The Aurelia Tower — Floor 41',
    target: 'The Aurelia Portrait',
    par: 190,
    start: { x: 82, y: 500 },
    exit: { x: 884, y: 96, w: 46, h: 46 },
    walls: [
      wall(260, 130, 200, 26), wall(260, 330, 26, 190),
      wall(560, 200, 26, 180), wall(560, 130, 200, 26),
      wall(700, 380, 140, 26), wall(120, 300, 90, 26),
    ],
    shadows: [
      shade(24, 120, 110, 140), shade(300, 380, 200, 110), shade(620, 420, 180, 90), shade(700, 160, 110, 130),
    ],
    guards: [
      guard([[150, 180], [420, 180], [420, 300], [150, 300]]),
      guard([[620, 180], [880, 180], [880, 330], [620, 330]], 60),
      guard([[350, 420], [640, 420], [640, 520], [350, 520]], 58),
      guard([[800, 420], [890, 420], [890, 540], [800, 540]], 70),
    ],
    cameras: [
      camera(20, 70, 0.5, 0.6, 5),
      camera(940, 300, Math.PI, 0.5, 4.5),
      camera(480, 70, Math.PI / 2, 0.55, 6),
    ],
    lasers: [laser(true, 0, 380, 500, 6, 0.25)],
    doors: [door(560, 380, 26, 80)],
    loot: [
      loot(360, 160, 'Jade Horse', 65),
      loot(680, 160, 'Crystal Decanter', 55),
      loot(460, 480, 'Opal Brooch', 75),
      loot(880, 500, 'The Aurelia Portrait', 200, true),
      loot(150, 480, 'Gold Cufflinks', 50),
    ],
  },
  {
    name: 'The Crown Room',
    sub: 'The Royal Exchange — The Last Night',
    target: 'The Crown of Vires',
    par: 220,
    start: { x: 480, y: 540 },
    exit: { x: 480, y: 96, w: 46, h: 46 },
    walls: [
      wall(200, 150, 26, 300), wall(734, 150, 26, 300),
      wall(380, 220, 200, 26), wall(380, 420, 200, 26),
      wall(300, 320, 60, 26), wall(600, 320, 60, 26),
    ],
    shadows: [
      shade(24, 140, 110, 160), shade(826, 140, 110, 160),
      shade(300, 470, 360, 80), shade(400, 260, 160, 120),
    ],
    guards: [
      guard([[120, 150], [120, 500], [180, 500], [180, 150]], 70),
      guard([[840, 150], [840, 500], [780, 500], [780, 150]], 70),
      guard([[300, 200], [660, 200], [660, 280], [300, 280]], 58),
      guard([[300, 400], [660, 400], [660, 480], [300, 480]], 58),
      guard([[480, 300], [480, 360], [380, 330], [580, 330]], 64),
    ],
    cameras: [
      camera(20, 70, 0.6, 0.5, 4.5),
      camera(940, 70, Math.PI * 0.75, 0.5, 4),
      camera(20, 585, -0.6, 0.5, 5.5),
      camera(940, 585, Math.PI + 0.6, 0.5, 5),
    ],
    lasers: [
      laser(true, 0, 300, 380, 6, 0),
      laser(true, 0, 420, 500, 7, 0.4),
    ],
    doors: [],
    loot: [
      loot(120, 540, 'Diamond Collar', 80),
      loot(840, 540, 'Sceptre of Tides', 90),
      loot(260, 180, 'Moonstone Ring', 70),
      loot(700, 180, 'Sunstone Ring', 70),
      loot(480, 180, 'The Orb of Vires', 110),
      loot(480, 340, 'The Crown of Vires', 300, true),
    ],
  },
];

// Seeded random: the same seed always builds the same patrol phases, so
// screenshots are reproducible and the autopilot's frames are deterministic.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
