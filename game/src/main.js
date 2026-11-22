// VELVET HOUR — the game loop and the screens. One night, five heists: the
// title, the plan (intel and tools), the heist itself, and the getaway.
// ?shot=cover|plan|vault|getaway stages a screenshot scene; ?seed=N fixes it.
import { HEISTS, mulberry32 } from './config.js';
import { createWorld, heistScore, stepWorld } from './world.js';
import { drawCaught, drawGetaway, drawPlan, drawTitle, drawWin, drawWorld } from './render.js';
import { createInput } from './input.js';
import { stageShot } from './shots.js';
import { isMuted, setDroneTension, setMuted, sfx, startDrone, unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;

const game = {
  screen: 'TITLE',
  heistIndex: 0,
  loadout: { coins: 2, tools: { smoke: 0, decoy: 0, pick: 0 } },
  world: null,
  totalScore: 0,
  ratings: [],
  breakdown: null,
  finalRating: '',
  buttons: [],
  toast: { text: '', alpha: 0 },
  paused: false,
  frozen: false,
  rng: mulberry32((Math.random() * 1e9) | 0),
};

function showToast(text) {
  game.toast = { text, alpha: 1 };
}

function startHeist() {
  game.world = createWorld(game.heistIndex, game.rng, game.loadout);
  game.screen = 'PLAY';
  game.paused = false;
  showToast(`${HEISTS[game.heistIndex].name} — take ${HEISTS[game.heistIndex].target}.`);
}

function applyEvents(events) {
  for (const e of events) {
    if (e === 'footstep') sfx.footstep();
    else if (e === 'pickup') sfx.pickup();
    else if (e === 'mainLoot') sfx.mainLoot();
    else if (e === 'decoy') sfx.decoy();
    else if (e === 'smoke') sfx.smoke();
    else if (e === 'door') sfx.door();
    else if (e === 'alarmTick') sfx.alarmTick();
    else if (e === 'caught') {
      sfx.caught();
      game.screen = 'CAUGHT';
    } else if (e === 'complete') {
      sfx.getaway();
      game.breakdown = heistScore(game.world);
      game.totalScore += game.breakdown.total;
      game.ratings.push(game.breakdown.rating);
      // Coins and tools carry to the next heist; what you spent is spent.
      game.loadout.coins = game.world.coins;
      game.loadout.tools = { ...game.world.tools };
      game.screen = 'GETAWAY';
    }
  }
  const w = game.world;
  if (w && w.messages.length > 0) {
    showToast(w.messages[w.messages.length - 1]);
    w.messages = [];
  }
}

function handleClick(click) {
  if (!click) return;
  unlockAudio();
  startDrone();
  for (const b of game.buttons) {
    if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
      sfx.click();
      if (b.id === 'begin') game.screen = 'PLAN';
      else if (b.id === 'begin-heist') startHeist();
      else if (b.id === 'retry') startHeist();
      else if (b.id === 'next') {
        if (game.heistIndex >= 4) {
          const ghosts = game.ratings.filter((r) => r === 'GHOST').length;
          game.finalRating = ghosts >= 4 ? 'TRUE GHOST' : ghosts >= 2 ? 'SHADOW' : 'SMASH & GRAB';
          game.screen = 'WIN';
        } else {
          game.heistIndex += 1;
          game.screen = 'PLAN';
        }
      } else if (b.id === 'again') {
        game.heistIndex = 0;
        game.totalScore = 0;
        game.ratings = [];
        game.loadout = { coins: 2, tools: { smoke: 0, decoy: 0, pick: 0 } };
        game.screen = 'PLAN';
      } else if (b.id.startsWith('buy-')) {
        const key = b.id.slice(4);
        const costs = { smoke: 2, decoy: 1, pick: 2 };
        if (game.loadout.coins >= costs[key]) {
          game.loadout.coins -= costs[key];
          game.loadout.tools[key] += 1;
          sfx.coin();
        }
      }
      return;
    }
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000 || 0.016);
  frame.last = now;

  if (input.wasPressed('KeyM')) setMuted(!isMuted());
  if (input.wasPressed('Enter')) {
    unlockAudio();
    startDrone();
    if (game.screen === 'TITLE') game.screen = 'PLAN';
    else if (game.screen === 'PLAN') startHeist();
    else if (game.screen === 'CAUGHT') startHeist();
    else if (game.screen === 'GETAWAY') handleClick({ x: -1, y: -1 }) || nextFromGetaway();
    else if (game.screen === 'WIN') game.screen = 'TITLE';
  }
  if (input.wasPressed('KeyP') && game.screen === 'PLAY') game.paused = !game.paused;

  handleClick(input.consumeClick());

  if (game.screen === 'PLAY' && game.world && !game.paused && !game.frozen) {
    const playInput = {
      up: input.up,
      down: input.down,
      left: input.left,
      right: input.right,
      run: input.run,
      useSmoke: input.wasPressed('Digit1'),
      useDecoy: input.wasPressed('Digit2'),
      decoyX: input.mouse.inside ? input.mouse.x : null,
      decoyY: input.mouse.inside ? input.mouse.y : null,
    };
    const events = stepWorld(game.world, playInput, dt);
    applyEvents(events);
    setDroneTension(game.world.alarm / 100);
  }

  if (game.toast.alpha > 0) game.toast.alpha = Math.max(0, game.toast.alpha - dt * 0.35);

  if (game.screen === 'TITLE') {
    const out = drawTitle(ctx, now / 1000);
    game.buttons = out.buttons;
  } else if (game.screen === 'PLAN') {
    const out = drawPlan(ctx, game);
    game.buttons = out.buttons;
  } else if (game.screen === 'PLAY' || game.screen === 'CAUGHT' || game.screen === 'GETAWAY') {
    drawWorld(ctx, game.world, { toast: game.toast });
    if (game.screen === 'CAUGHT') {
      const out = drawCaught(ctx, game);
      game.buttons = out.buttons;
    } else if (game.screen === 'GETAWAY') {
      const out = drawGetaway(ctx, game, game.breakdown);
      game.buttons = out.buttons;
    } else {
      game.buttons = [];
      if (game.paused) {
        ctx.fillStyle = 'rgba(4, 5, 14, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ece7da';
        ctx.font = '700 28px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED — press P to continue', canvas.width / 2, canvas.height / 2);
      }
    }
  } else if (game.screen === 'WIN') {
    const out = drawWin(ctx, game);
    game.buttons = out.buttons;
  }

  input.endFrame();
}

function nextFromGetaway() {
  if (game.heistIndex >= 4) {
    const ghosts = game.ratings.filter((r) => r === 'GHOST').length;
    game.finalRating = ghosts >= 4 ? 'TRUE GHOST' : ghosts >= 2 ? 'SHADOW' : 'SMASH & GRAB';
    game.screen = 'WIN';
  } else {
    game.heistIndex += 1;
    game.screen = 'PLAN';
  }
}

// Screenshot staging: ?shot= stages the scene and freezes the simulation so
// the frame is exactly the one the autopilot produced.
if (shotName) {
  game.frozen = true;
  game.screen = stageShot(shotName, game, seed);
}

canvas.addEventListener('click', () => {
  unlockAudio();
  startDrone();
});
window.addEventListener('keydown', () => {
  unlockAudio();
  startDrone();
}, { once: true });

requestAnimationFrame(frame);
