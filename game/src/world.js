// VELVET HOUR — the world: state, guards, cameras, lasers, noise and the
// alarm. One step moves the thief, runs every patrol, tests every cone and
// returns the events the frame produced (pickups, alarms, catches).
import { HEISTS, TUNING, VIEW } from './config.js';
import {
  dist, distToSegment, inCone, losBlocked, pointInShadow, pointInSmoke,
  pushOutOfRect, watcherSees,
} from './stealth.js';

const THIEF_R = 13;
const GUARD_R = 13;

function makeGuard(def, rng) {
  const [sx, sy] = def.patrol[0];
  return {
    x: sx, y: sy, dir: 0, patrol: def.patrol, wp: 1,
    speed: def.speed, range: def.range, halfAngle: def.halfAngle,
    pause: def.pause, pauseT: rng() * def.pause, sweepPhase: rng() * Math.PI * 2,
    mode: 'patrol', tx: sx, ty: sy, lookT: 0, alertT: 0, seenX: sx, seenY: sy,
  };
}

function makeCamera(def) {
  return { ...def, dir: def.baseAngle, t: 0 };
}

export function createWorld(heistIndex, rng, loadout) {
  const def = HEISTS[heistIndex];
  return {
    index: heistIndex,
    def,
    time: 0,
    thief: { x: def.start.x, y: def.start.y, dir: -Math.PI / 2, moving: false, running: false },
    guards: def.guards.map((g) => makeGuard(g, rng)),
    cameras: def.cameras.map(makeCamera),
    loot: def.loot.map((l) => ({ ...l, taken: false, glint: rng() * Math.PI * 2 })),
    doors: def.doors.map((d) => ({ ...d, openT: 0 })),
    alarm: 0,
    maxAlarm: 0,
    spotted: 0,
    pulses: [],
    smokes: [],
    coins: loadout.coins,
    tools: { ...loadout.tools },
    score: 0,
    lootTaken: 0,
    mainTaken: false,
    noiseT: 0,
    stepT: 0,
    caught: false,
    complete: false,
    messages: [],
    laserT: 0,
  };
}

export function laserBeam(def, t) {
  const osc = (Math.sin((t / def.period) * Math.PI * 2 + def.phase * Math.PI * 2) + 1) / 2;
  const pos = def.from + (def.to - def.from) * osc;
  if (def.horizontal) return { x1: VIEW.border + 8, y1: pos, x2: VIEW.width - VIEW.border - 8, y2: pos };
  return { x1: pos, y1: VIEW.hud + 8, x2: pos, y2: VIEW.height - VIEW.border - 8 };
}

function moveGuard(g, dt, state) {
  const speed = g.mode === 'chase' ? g.speed * 1.4 : g.speed;
  if (g.mode === 'patrol') {
    if (g.pauseT > 0) {
      g.pauseT -= dt;
      g.sweepPhase += dt * 1.6;
      g.dir += Math.sin(g.sweepPhase) * dt * 1.1;
      return;
    }
    const [tx, ty] = g.patrol[g.wp];
    const d = dist(g.x, g.y, tx, ty);
    if (d < 6) {
      g.wp = (g.wp + 1) % g.patrol.length;
      g.pauseT = g.pause;
      return;
    }
    const want = Math.atan2(ty - g.y, tx - g.x);
    g.dir = turnToward(g.dir, want, dt * 6);
    g.x += Math.cos(g.dir) * speed * dt;
    g.y += Math.sin(g.dir) * speed * dt;
    return;
  }
  // investigate / chase / return: walk to the target point.
  const d = dist(g.x, g.y, g.tx, g.ty);
  if (d < 10) {
    if (g.mode === 'chase') {
      g.lookT += dt;
      g.dir += dt * 2.2;
      if (g.lookT > 1.6) {
        g.mode = 'return';
        const [hx, hy] = nearestWaypoint(g);
        g.tx = hx;
        g.ty = hy;
      }
    } else if (g.mode === 'investigate') {
      g.lookT += dt;
      g.dir += Math.sin(g.lookT * 3) * dt * 1.4;
      if (g.lookT > TUNING.investigateSeconds) {
        g.mode = 'return';
        const [hx, hy] = nearestWaypoint(g);
        g.tx = hx;
        g.ty = hy;
      }
    } else {
      g.mode = 'patrol';
      g.wp = nearestWaypointIndex(g);
      g.pauseT = 0.4;
    }
    return;
  }
  const want = Math.atan2(g.ty - g.y, g.tx - g.x);
  g.dir = turnToward(g.dir, want, dt * 6);
  g.x += Math.cos(g.dir) * speed * dt;
  g.y += Math.sin(g.dir) * speed * dt;
}

function nearestWaypoint(g) {
  let best = g.patrol[0];
  let bd = Infinity;
  for (const p of g.patrol) {
    const d = dist(g.x, g.y, p[0], p[1]);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

function nearestWaypointIndex(g) {
  let best = 0;
  let bd = Infinity;
  g.patrol.forEach((p, i) => {
    const d = dist(g.x, g.y, p[0], p[1]);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return (best + 1) % g.patrol.length;
}

function turnToward(a, target, maxStep) {
  let d = target - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maxStep) return target;
  return a + Math.sign(d) * maxStep;
}

function collide(state, x, y) {
  const minX = VIEW.border + THIEF_R;
  const maxX = VIEW.width - VIEW.border - THIEF_R;
  const minY = VIEW.hud + VIEW.border + THIEF_R;
  const maxY = VIEW.height - VIEW.border - THIEF_R;
  let nx = Math.max(minX, Math.min(maxX, x));
  let ny = Math.max(minY, Math.min(maxY, y));
  const solids = [...state.def.walls, ...state.doors.filter((d) => d.locked)];
  for (const r of solids) {
    const hit = pushOutOfRect(nx, ny, THIEF_R, r);
    if (hit) {
      nx = hit.x;
      ny = hit.y;
    }
  }
  return { x: nx, y: ny };
}

function guardSeesThief(state, g) {
  return watcherSees(g, state.thief, state.def.walls, state.doors, state.def.shadows, state.smokes);
}

// One simulation step. `input` carries movement axes, run flag and one-shot
// tool requests. Returns the events this frame produced.
export function stepWorld(state, input, dt) {
  const events = [];
  if (state.caught || state.complete) return events;
  state.time += dt;
  state.laserT += dt;
  const t = state.thief;

  // --- thief movement ---
  const mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const moving = mx !== 0 || my !== 0;
  t.moving = moving;
  t.running = moving && input.run;
  if (moving) {
    const len = Math.hypot(mx, my);
    const speed = t.running ? TUNING.runSpeed : TUNING.walkSpeed;
    const nx = t.x + (mx / len) * speed * dt;
    const ny = t.y + (my / len) * speed * dt;
    const fixed = collide(state, nx, ny);
    t.x = fixed.x;
    t.y = fixed.y;
    t.dir = Math.atan2(my, mx);
    state.stepT += dt * (t.running ? 1.6 : 1);
    if (state.stepT > 0.34) {
      state.stepT = 0;
      if (t.running) events.push('footstep');
    }
    if (t.running) {
      state.noiseT += dt;
      if (state.noiseT >= TUNING.noiseRunInterval) {
        state.noiseT = 0;
        state.pulses.push({ x: t.x, y: t.y, r: 12, max: TUNING.noiseRunRadius, life: 0.9, t: 0 });
        events.push('noise');
      }
    }
  }

  // --- tools ---
  if (input.useSmoke && state.tools.smoke > 0) {
    state.tools.smoke -= 1;
    state.smokes.push({ x: t.x, y: t.y, r: TUNING.smokeRadius, t: TUNING.smokeSeconds });
    events.push('smoke');
  }
  if (input.useDecoy && state.tools.decoy > 0 && input.decoyX !== null) {
    state.tools.decoy -= 1;
    const dx = input.decoyX - t.x;
    const dy = input.decoyY - t.y;
    const d = Math.hypot(dx, dy) || 1;
    const reach = Math.min(d, 280);
    const px = t.x + (dx / d) * reach;
    const py = t.y + (dy / d) * reach;
    state.pulses.push({ x: px, y: py, r: 12, max: TUNING.noiseDecoyRadius, life: 1.1, t: 0 });
    for (const g of state.guards) {
      if (g.mode === 'patrol' && dist(g.x, g.y, px, py) < 300) {
        g.mode = 'investigate';
        g.tx = px;
        g.ty = py;
        g.lookT = 0;
      }
    }
    events.push('decoy');
  }

  // --- doors: channel to open, or instant with a lockpick ---
  for (const d of state.doors) {
    if (!d.locked) continue;
    const cx = d.x + d.w / 2;
    const cy = d.y + d.h / 2;
    if (dist(t.x, t.y, cx, cy) < 52) {
      if (state.tools.pick > 0) {
        d.locked = false;
        state.tools.pick -= 1;
        events.push('door');
      } else if (!moving) {
        d.openT += dt / TUNING.doorChannelSeconds;
        if (d.openT >= 1) {
          d.locked = false;
          events.push('door');
        }
      } else {
        d.openT = Math.max(0, d.openT - dt * 0.5);
      }
    } else {
      d.openT = Math.max(0, d.openT - dt * 0.5);
    }
  }

  // --- pulses and smoke age ---
  for (const p of state.pulses) {
    p.t += dt;
    p.r = 12 + (p.max - 12) * Math.min(1, p.t / 0.7);
  }
  state.pulses = state.pulses.filter((p) => p.t < p.life);
  for (const s of state.smokes) s.t -= dt;
  state.smokes = state.smokes.filter((s) => s.t > 0);

  // --- cameras sweep ---
  for (const c of state.cameras) {
    c.t += dt;
    c.dir = c.baseAngle + Math.sin((c.t / c.period) * Math.PI * 2) * c.sweep;
  }

  // --- guards move, then look ---
  let worstSeen = 0;
  let worstIsGuard = false;
  for (const g of state.guards) {
    moveGuard(g, dt, state);
    const seen = guardSeesThief(state, g);
    if (seen > 0.15) {
      g.seenX = t.x;
      g.seenY = t.y;
      g.alertT = 1.2;
      if (g.mode !== 'chase') {
        g.mode = 'chase';
        g.tx = t.x;
        g.ty = t.y;
        g.lookT = 0;
      } else {
        g.tx = t.x;
        g.ty = t.y;
      }
      if (seen > worstSeen) {
        worstSeen = seen;
        worstIsGuard = true;
      }
    } else if (g.alertT > 0) {
      g.alertT -= dt;
      if (g.alertT <= 0 && g.mode === 'chase') {
        g.mode = 'return';
        const [hx, hy] = nearestWaypoint(g);
        g.tx = hx;
        g.ty = hy;
      }
    }
    // Running noise draws nearby patrolling guards to the sound.
    if (g.mode === 'patrol') {
      for (const p of state.pulses) {
        if (p.max >= TUNING.noiseRunRadius && dist(g.x, g.y, p.x, p.y) < p.r + 60) {
          g.mode = 'investigate';
          g.tx = p.x;
          g.ty = p.y;
          g.lookT = 0;
          break;
        }
      }
    }
  }
  for (const c of state.cameras) {
    const seen = watcherSees(c, t, state.def.walls, state.doors, state.def.shadows, state.smokes);
    if (seen > 0.15 && seen > worstSeen) {
      worstSeen = seen;
      worstIsGuard = false;
    }
  }

  // --- lasers ---
  let inLaser = false;
  for (const l of state.def.lasers) {
    const beam = laserBeam(l, state.laserT);
    if (distToSegment(t.x, t.y, beam.x1, beam.y1, beam.x2, beam.y2) < 9) inLaser = true;
  }

  // --- alarm meter ---
  const inShadow = pointInShadow(t.x, t.y, state.def.shadows);
  if (worstSeen > 0) {
    const base = worstIsGuard ? TUNING.alarmSeenGuard : TUNING.alarmSeenCamera;
    state.alarm += base * worstSeen * dt * (inShadow ? TUNING.shadowAlarmFactor : 1);
    state.spotted = Math.min(1, state.spotted + dt * 3);
  } else {
    state.alarm = Math.max(0, state.alarm - TUNING.alarmDecay * dt);
    state.spotted = Math.max(0, state.spotted - dt * 2);
  }
  if (inLaser) {
    state.alarm += TUNING.alarmLaser * dt;
    state.spotted = 1;
    if (Math.random() < dt * 6) events.push('alarmTick');
  }
  state.maxAlarm = Math.max(state.maxAlarm, state.alarm);
  if (state.alarm >= 100) {
    state.alarm = 100;
    state.caught = true;
    events.push('caught');
    return events;
  }

  // --- loot ---
  for (const l of state.loot) {
    if (l.taken) continue;
    if (dist(t.x, t.y, l.x, l.y) < 26) {
      l.taken = true;
      state.lootTaken += 1;
      state.score += l.value;
      state.coins += Math.max(1, Math.round(l.value / 25));
      if (l.main) {
        state.mainTaken = true;
        events.push('mainLoot');
        state.messages.push(`${l.name} is yours. Get to the exit.`);
      } else {
        events.push('pickup');
        state.messages.push(`${l.name} — $${l.value}`);
      }
    }
  }

  // --- exit ---
  const ex = state.def.exit;
  const ecx = ex.x + ex.w / 2;
  const ecy = ex.y + ex.h / 2;
  if (dist(t.x, t.y, ecx, ecy) < 34) {
    if (state.mainTaken) {
      state.complete = true;
      events.push('complete');
    } else if (Math.random() < dt * 0.5) {
      state.messages.push('The exit is sealed until you take the target.');
    }
  }
  return events;
}

export function heistScore(state) {
  const def = state.def;
  const timeBonus = Math.max(0, Math.round((def.par - state.time) * 2));
  const ghostBonus = state.maxAlarm < 25 ? 100 : 0;
  const total = state.score + timeBonus + ghostBonus + 50;
  const rating = state.maxAlarm < 25 ? 'GHOST' : state.maxAlarm < 60 ? 'SHADOW' : 'SMASH & GRAB';
  return { loot: state.score, timeBonus, ghostBonus, completion: 50, total, rating, time: state.time };
}
