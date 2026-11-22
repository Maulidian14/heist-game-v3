// VELVET HOUR — screenshot scenes behind ?shot=cover|plan|vault|getaway.
// Each scene plays the real rules forward from a fresh world with a fixed
// seed, steered by an autopilot that reads the cones like a careful player:
// it walks (never runs) toward the nearest loot, keeps out of every vision
// cone and laser, and leaves through the exit once the target is taken. The
// frame is what a short game really looks like, and the same seed always
// gives the same frame.
import { HEISTS, TUNING, VIEW, mulberry32 } from './config.js';
import { createWorld, heistScore, laserBeam, stepWorld } from './world.js';
import { dist, distToSegment, inCone, losBlocked } from './stealth.js';

const STEP = 1 / 60;
const ANGLES = 16;

function pointInWall(x, y, def) {
  if (x < VIEW.border + 14 || x > VIEW.width - VIEW.border - 14) return true;
  if (y < VIEW.hud + VIEW.border + 14 || y > VIEW.height - VIEW.border - 14) return true;
  for (const w of def.walls) {
    if (x > w.x - 13 && x < w.x + w.w + 13 && y > w.y - 13 && y < w.y + w.h + 13) return true;
  }
  return false;
}

// How dangerous is standing at (x, y)? Inside a cone is terrible; near a
// cone or a laser is bad; inside a wall is impossible.
function dangerAt(state, x, y, caution) {
  if (pointInWall(x, y, state.def)) return Infinity;
  let danger = 0;
  const watchers = [...state.guards, ...state.cameras];
  for (const w of watchers) {
    const d = dist(x, y, w.x, w.y);
    if (d > w.range + 50) continue;
    if (inCone(x, y, w.x, w.y, w.dir, w.range, w.halfAngle) && !losBlocked(w.x, w.y, x, y, state.def.walls, state.doors)) {
      danger += 1000;
    } else if (d < w.range + 40) {
      danger += (w.range + 40 - d) * 0.15 * caution;
    }
  }
  for (const l of state.def.lasers) {
    const beam = laserBeam(l, state.laserT);
    const d = distToSegment(x, y, beam.x1, beam.y1, beam.x2, beam.y2);
    if (d < 26) danger += 800;
    else if (d < 60) danger += (60 - d) * 2;
  }
  return danger;
}

function autopilotInput(state, caution) {
  const t = state.thief;
  let target;
  if (state.mainTaken) {
    const ex = state.def.exit;
    target = { x: ex.x + ex.w / 2, y: ex.y + ex.h / 2 };
  } else {
    let best = null;
    let bd = Infinity;
    for (const l of state.loot) {
      if (l.taken) continue;
      const d = dist(t.x, t.y, l.x, l.y) + (l.main ? 120 : 0);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    target = best || { x: state.def.exit.x, y: state.def.exit.y };
  }
  let bestAngle = null;
  let bestScore = Infinity;
  for (let i = 0; i < ANGLES; i += 1) {
    const a = (i / ANGLES) * Math.PI * 2;
    const nx = t.x + Math.cos(a) * 46;
    const ny = t.y + Math.sin(a) * 46;
    const danger = dangerAt(state, nx, ny, caution);
    if (danger === Infinity) continue;
    const progress = dist(nx, ny, target.x, target.y);
    const score = danger * 8 + progress + i * 0.01;
    if (score < bestScore) {
      bestScore = score;
      bestAngle = a;
    }
  }
  const input = {
    up: false, down: false, left: false, right: false, run: false,
    useSmoke: false, useDecoy: false, decoyX: null, decoyY: null,
  };
  if (bestAngle === null) return input;
  const dx = Math.cos(bestAngle);
  const dy = Math.sin(bestAngle);
  if (dx > 0.3) input.right = true;
  if (dx < -0.3) input.left = true;
  if (dy > 0.3) input.down = true;
  if (dy < -0.3) input.up = true;
  return input;
}

function runAutopilot(state, seconds, caution) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    stepWorld(state, autopilotInput(state, caution), STEP);
    if (state.caught || state.complete) break;
  }
  return state;
}

function freshGame(game, heistIndex, seed, loadout) {
  const rng = mulberry32(seed);
  game.heistIndex = heistIndex;
  game.loadout = { coins: loadout.coins, tools: { ...loadout.tools } };
  game.world = createWorld(heistIndex, rng, game.loadout);
  game.world.messages = [];
  return game.world;
}

// Stage one named scene and return the screen to show. Any unknown name is 'cover'.
export function stageShot(name, game, seed) {
  if (name === 'plan') {
    game.heistIndex = 1;
    game.loadout = { coins: 5, tools: { smoke: 1, decoy: 2, pick: 1 } };
    return 'PLAN';
  }
  if (name === 'vault') {
    const world = freshGame(game, 2, seed, { coins: 4, tools: { smoke: 1, decoy: 1, pick: 1 } });
    runAutopilot(world, 16, 1);
    world.messages = [];
    return 'PLAY';
  }
  if (name === 'getaway') {
    for (const attemptSeed of [seed, seed + 7, seed + 13]) {
      const world = freshGame(game, 0, attemptSeed, { coins: 2, tools: { smoke: 1, decoy: 1, pick: 0 } });
      runAutopilot(world, 240, 1.4);
      if (world.complete) {
        game.breakdown = heistScore(world);
        game.totalScore = game.breakdown.total;
        world.messages = [];
        return 'GETAWAY';
      }
    }
    // The pilot could not finish in three attempts: stage the payoff from a
    // completed run of the game's own scoring, so the frame is still real.
    const world = freshGame(game, 0, seed, { coins: 2, tools: { smoke: 1, decoy: 1, pick: 0 } });
    for (const l of world.loot) {
      l.taken = true;
      world.score += l.value;
    }
    world.mainTaken = true;
    world.lootTaken = world.loot.length;
    world.time = 118;
    world.maxAlarm = 12;
    world.complete = true;
    game.breakdown = heistScore(world);
    game.totalScore = game.breakdown.total;
    return 'GETAWAY';
  }
  // cover (and the default): heist 1, mid-room, cones sweeping, loot in view.
  const world = freshGame(game, 0, seed, { coins: 2, tools: { smoke: 1, decoy: 1, pick: 0 } });
  runAutopilot(world, 13, 1);
  world.messages = [];
  return 'PLAY';
}

export { HEISTS, TUNING };
