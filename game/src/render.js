// VELVET HOUR — all drawing: the room, the cones, the thief, the HUD and
// every screen. The cover frame must show a complete heist at a glance: the
// thief crossing a room, guards with vision cones, a camera, a loot target
// and the alarm meter — so the HUD and the loot labels are drawn big.
import { HEISTS, PALETTE, TOOLS, TUNING, VIEW } from './config.js';
import { conePoints } from './stealth.js';
import { laserBeam } from './world.js';

const HUD_H = VIEW.hud;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'left', weight = 600, font = 'system-ui, sans-serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function drawFloor(ctx, state) {
  ctx.fillStyle = PALETTE.floorA;
  ctx.fillRect(0, HUD_H, VIEW.width, VIEW.height - HUD_H);
  ctx.fillStyle = PALETTE.floorB;
  for (let y = HUD_H; y < VIEW.height; y += 48) {
    for (let x = 0; x < VIEW.width; x += 48) {
      if (((x / 48 + y / 48) | 0) % 2 === 0) ctx.fillRect(x, y, 48, 48);
    }
  }
  // Warm light pools under the loot and the exit: the eye goes to the gold.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of state.loot) {
    const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, 90);
    g.addColorStop(0, 'rgba(255, 196, 96, 0.16)');
    g.addColorStop(1, 'rgba(255, 196, 96, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(l.x - 90, l.y - 90, 180, 180);
  }
  ctx.restore();
  // Shadow zones: dark, soft-edged, safe.
  for (const s of state.def.shadows) {
    ctx.fillStyle = PALETTE.shadow;
    rr(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 14);
    ctx.fill();
    ctx.fillStyle = 'rgba(2, 3, 12, 0.35)';
    rr(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.fill();
  }
  // Border walls.
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, HUD_H, VIEW.width, VIEW.border);
  ctx.fillRect(0, VIEW.height - VIEW.border, VIEW.width, VIEW.border);
  ctx.fillRect(0, HUD_H, VIEW.border, VIEW.height - HUD_H);
  ctx.fillRect(VIEW.width - VIEW.border, HUD_H, VIEW.border, VIEW.height - HUD_H);
}

function drawLasers(ctx, state) {
  for (const l of state.def.lasers) {
    const beam = laserBeam(l, state.laserT);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 84, 112, 0.25)';
    ctx.setLineDash([4, 8]);
    ctx.lineWidth = 1;
    if (l.horizontal) {
      ctx.beginPath();
      ctx.moveTo(beam.x1, l.from);
      ctx.lineTo(beam.x2, l.from);
      ctx.moveTo(beam.x1, l.to);
      ctx.lineTo(beam.x2, l.to);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(l.from, beam.y1);
      ctx.lineTo(l.from, beam.y2);
      ctx.moveTo(l.to, beam.y1);
      ctx.lineTo(l.to, beam.y2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = PALETTE.laser;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = PALETTE.laser;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffd7de';
    ctx.beginPath();
    ctx.arc(beam.x1, beam.y1, 4, 0, Math.PI * 2);
    ctx.arc(beam.x2, beam.y2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLoot(ctx, state) {
  for (const l of state.loot) {
    if (l.taken) continue;
    const pulse = 0.75 + Math.sin(state.time * 3 + l.glint) * 0.25;
    const size = l.main ? 11 : 8;
    ctx.save();
    ctx.shadowColor = PALETTE.loot;
    ctx.shadowBlur = 16 * pulse;
    ctx.fillStyle = l.main ? PALETTE.lootMain : PALETTE.loot;
    ctx.beginPath();
    ctx.moveTo(l.x, l.y - size);
    ctx.lineTo(l.x + size * 0.8, l.y);
    ctx.lineTo(l.x, l.y + size);
    ctx.lineTo(l.x - size * 0.8, l.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (l.main) {
      ctx.strokeStyle = 'rgba(255, 236, 158, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 18 + Math.sin(state.time * 2) * 2, 0, Math.PI * 2);
      ctx.stroke();
      text(ctx, l.name.toUpperCase(), l.x, l.y + 30, 10, PALETTE.lootMain, 'center', 700);
    } else {
      text(ctx, `$${l.value}`, l.x, l.y + 20, 10, PALETTE.gold, 'center', 600);
    }
  }
}

function drawExit(ctx, state) {
  const ex = state.def.exit;
  const open = state.mainTaken;
  const cx = ex.x + ex.w / 2;
  const cy = ex.y + ex.h / 2;
  ctx.save();
  if (open) {
    ctx.shadowColor = PALETTE.exit;
    ctx.shadowBlur = 20;
  }
  ctx.fillStyle = open ? '#1f5c3a' : '#2a2d4a';
  rr(ctx, ex.x, ex.y, ex.w, ex.h, 8);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = open ? PALETTE.exit : PALETTE.dim;
  ctx.lineWidth = 2;
  rr(ctx, ex.x, ex.y, ex.w, ex.h, 8);
  ctx.stroke();
  ctx.fillStyle = open ? PALETTE.exit : PALETTE.dim;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 6);
  ctx.lineTo(cx + 2, cy - 6);
  ctx.lineTo(cx + 2, cy - 12);
  ctx.lineTo(cx + 14, cy);
  ctx.lineTo(cx + 2, cy + 12);
  ctx.lineTo(cx + 2, cy + 6);
  ctx.lineTo(cx - 8, cy + 6);
  ctx.closePath();
  ctx.fill();
  text(ctx, open ? 'GETAWAY' : 'LOCKED', cx, ex.y + ex.h + 13, 10, open ? PALETTE.exit : PALETTE.dim, 'center', 700);
}

function drawDoors(ctx, state) {
  for (const d of state.doors) {
    if (!d.locked) {
      ctx.fillStyle = 'rgba(168, 137, 74, 0.25)';
      ctx.fillRect(d.x, d.y, d.w, d.h);
      continue;
    }
    ctx.fillStyle = PALETTE.door;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = PALETTE.doorTop;
    ctx.fillRect(d.x, d.y, d.w, 4);
    text(ctx, 'LOCKED', d.x + d.w / 2, d.y + d.h / 2, 9, '#f5e6b8', 'center', 700);
    if (d.openT > 0) {
      ctx.strokeStyle = PALETTE.exit;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(d.x + d.w / 2, d.y + d.h / 2, 20, -Math.PI / 2, -Math.PI / 2 + d.openT * Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawWalls(ctx, state) {
  for (const w of state.def.walls) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(w.x + 3, w.y + 4, w.w, w.h);
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 4);
  }
}

function drawCone(ctx, x, y, dir, range, halfAngle, fill, edge) {
  const pts = conePoints(x, y, dir, range, halfAngle);
  const g = ctx.createRadialGradient(x, y, 8, x, y, range);
  g.addColorStop(0, fill);
  g.addColorStop(0.6, fill);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(pts[1][0], pts[1][1]);
  ctx.moveTo(x, y);
  ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  ctx.stroke();
}

function drawGuards(ctx, state) {
  for (const g of state.guards) {
    const alert = g.mode === 'chase' || g.mode === 'investigate';
    const fill = alert ? 'rgba(255, 110, 80, 0.42)' : PALETTE.coneGuard;
    const edge = alert ? 'rgba(255, 140, 100, 0.8)' : PALETTE.coneGuardEdge;
    drawCone(ctx, g.x, g.y, g.dir, g.range, g.halfAngle, fill, edge);
  }
  for (const g of state.guards) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 10, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guardTrim;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.guardTrim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.dir) * 15, g.y + Math.sin(g.dir) * 15);
    ctx.stroke();
    if (g.mode === 'chase') {
      text(ctx, '!', g.x, g.y - 24, 16, '#ff6e50', 'center', 800);
    } else if (g.mode === 'investigate') {
      text(ctx, '?', g.x, g.y - 24, 14, PALETTE.gold, 'center', 800);
    }
  }
}
const GUARD_R = 13;

function drawCameras(ctx, state) {
  for (const c of state.cameras) {
    drawCone(ctx, c.x, c.y, c.dir, c.range, c.halfAngle, PALETTE.coneCamera, PALETTE.coneCameraEdge);
  }
  for (const c of state.cameras) {
    ctx.fillStyle = PALETTE.camera;
    rr(ctx, c.x - 8, c.y - 6, 16, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#ff4d5e';
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(c.dir) * 8, c.y + Math.sin(c.dir) * 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawThief(ctx, state) {
  const t = state.thief;
  const inShadow = state.def.shadows.some(
    (s) => t.x >= s.x && t.x <= s.x + s.w && t.y >= s.y && t.y <= s.y + s.h,
  );
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 11, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // A soft ring marks the thief at a glance, even shrunk to a contact sheet.
  ctx.strokeStyle = 'rgba(242, 237, 226, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = inShadow ? 0.82 : 1;
  // Cloak: a hooded triangle pointing where the thief faces.
  ctx.fillStyle = PALETTE.thiefCloak;
  ctx.beginPath();
  ctx.moveTo(t.x + Math.cos(t.dir) * 18, t.y + Math.sin(t.dir) * 18);
  ctx.lineTo(t.x + Math.cos(t.dir + 2.4) * 14, t.y + Math.sin(t.dir + 2.4) * 14);
  ctx.lineTo(t.x + Math.cos(t.dir - 2.4) * 14, t.y + Math.sin(t.dir - 2.4) * 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(242, 237, 226, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (t.running) {
    ctx.strokeStyle = 'rgba(127, 212, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 18 + Math.sin(state.time * 10) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawNoiseAndSmoke(ctx, state) {
  for (const p of state.pulses) {
    const a = Math.max(0, 1 - p.t / p.life);
    ctx.strokeStyle = `rgba(127, 212, 255, ${0.55 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const s of state.smokes) {
    const a = Math.min(1, s.t);
    ctx.fillStyle = `rgba(200, 205, 220, ${0.3 * a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(220, 225, 240, ${0.22 * a})`;
    ctx.beginPath();
    ctx.arc(s.x - 30, s.y + 14, s.r * 0.6, 0, Math.PI * 2);
    ctx.arc(s.x + 34, s.y - 18, s.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, state, ui) {
  ctx.fillStyle = '#10122a';
  ctx.fillRect(0, 0, VIEW.width, HUD_H);
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(0, HUD_H - 2, VIEW.width, 2);
  const def = state.def;
  text(ctx, `${state.index + 1}/5  ${def.name.toUpperCase()}`, 14, 20, 13, PALETTE.text, 'left', 700);
  text(ctx, `Target: ${def.target}`, 14, 38, 11, PALETTE.dim, 'left', 500);
  // Alarm meter: the big one, centre.
  const ax = 330;
  const aw = 300;
  text(ctx, 'ALARM', ax, 14, 10, state.spotted > 0.4 ? PALETTE.alarm : PALETTE.dim, 'left', 700);
  ctx.fillStyle = '#23264a';
  rr(ctx, ax, 22, aw, 18, 6);
  ctx.fill();
  const frac = state.alarm / 100;
  const grad = ctx.createLinearGradient(ax, 0, ax + aw, 0);
  grad.addColorStop(0, '#7fe0a8');
  grad.addColorStop(0.55, '#ffd76a');
  grad.addColorStop(1, '#ff4d5e');
  if (frac > 0) {
    ctx.fillStyle = grad;
    rr(ctx, ax, 22, Math.max(8, aw * frac), 18, 6);
    ctx.fill();
  }
  if (state.spotted > 0.4 && Math.sin(state.time * 10) > 0) {
    ctx.strokeStyle = PALETTE.alarm;
    ctx.lineWidth = 2;
    rr(ctx, ax, 22, aw, 18, 6);
    ctx.stroke();
  }
  text(ctx, `${Math.round(state.alarm)}%`, ax + aw + 10, 31, 12, PALETTE.text, 'left', 700);
  // Loot, coins, timer, sound.
  const lootTotal = state.loot.length;
  text(ctx, `◆ ${state.lootTaken}/${lootTotal}`, 690, 20, 13, PALETTE.loot, 'left', 700);
  text(ctx, `◉ ${state.coins} coins`, 690, 38, 11, PALETTE.gold, 'left', 600);
  const mins = Math.floor(state.time / 60);
  const secs = Math.floor(state.time % 60);
  text(ctx, `${mins}:${String(secs).padStart(2, '0')}  /  par ${Math.floor(def.par / 60)}:${String(def.par % 60).padStart(2, '0')}`, 820, 20, 12, PALETTE.text, 'left', 600);
  const soundLabel = state.thief.running ? 'RUNNING — LOUD' : 'SILENT';
  text(ctx, soundLabel, 820, 38, 11, state.thief.running ? PALETTE.noise : PALETTE.dim, 'left', 700);
  // Tools row, bottom of the HUD.
  const toolNames = ['smoke', 'decoy', 'pick'];
  toolNames.forEach((key, i) => {
    const tool = TOOLS[key];
    const x = 14 + i * 150;
    const owned = state.tools[key];
    ctx.fillStyle = owned > 0 ? '#1d2042' : '#151729';
    rr(ctx, x, HUD_H + 6, 140, 22, 6);
    ctx.fill();
    ctx.fillStyle = owned > 0 ? PALETTE.text : PALETTE.dim;
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`[${tool.key}] ${tool.name} ×${owned}`, x + 8, HUD_H + 17);
  });
  // (The controls hint lives under the canvas in the page, not in the HUD:
  // the top-right corner belongs to the cameras.)
}

function drawToast(ctx, toast) {
  if (!toast || toast.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = toast.alpha;
  ctx.fillStyle = 'rgba(10, 11, 26, 0.88)';
  const w = Math.min(560, 24 + toast.text.length * 7.5);
  rr(ctx, (VIEW.width - w) / 2, VIEW.height - 44, w, 30, 8);
  ctx.fill();
  text(ctx, toast.text, VIEW.width / 2, VIEW.height - 29, 13, PALETTE.text, 'center', 600);
  ctx.restore();
}

function drawVignette(ctx, state) {
  const g = ctx.createRadialGradient(
    VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.42,
    VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.85,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(2, 3, 10, 0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  if (state.spotted > 0.4) {
    ctx.strokeStyle = `rgba(255, 77, 94, ${0.35 * state.spotted})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, VIEW.width - 6, VIEW.height - 6);
  }
}

export function drawWorld(ctx, state, ui) {
  drawFloor(ctx, state);
  drawLasers(ctx, state);
  drawLoot(ctx, state);
  drawExit(ctx, state);
  drawDoors(ctx, state);
  drawWalls(ctx, state);
  drawGuards(ctx, state);
  drawCameras(ctx, state);
  drawNoiseAndSmoke(ctx, state);
  drawThief(ctx, state);
  drawHud(ctx, state, ui);
  drawToast(ctx, ui.toast);
  drawVignette(ctx, state);
}

// ---------------------------------------------------------------- screens

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 9, 22, 0.92)';
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.wallTop;
  ctx.lineWidth = 1.5;
  rr(ctx, x, y, w, h, 14);
  ctx.stroke();
}

function button(ctx, x, y, w, h, label, enabled = true) {
  ctx.fillStyle = enabled ? '#8a6d2b' : '#2a2d4a';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = enabled ? PALETTE.gold : PALETTE.dim;
  ctx.lineWidth = 1.5;
  rr(ctx, x, y, w, h, 8);
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 1, 14, enabled ? '#fff6d8' : PALETTE.dim, 'center', 700);
  return { x, y, w, h };
}

export function drawTitle(ctx, time) {
  ctx.fillStyle = '#070812';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Moon and skyline.
  const mg = ctx.createRadialGradient(740, 120, 10, 740, 120, 120);
  mg.addColorStop(0, 'rgba(240, 230, 200, 0.9)');
  mg.addColorStop(0.25, 'rgba(240, 230, 200, 0.25)');
  mg.addColorStop(1, 'rgba(240, 230, 200, 0)');
  ctx.fillStyle = mg;
  ctx.fillRect(600, 0, 300, 260);
  ctx.fillStyle = '#f0e6c8';
  ctx.beginPath();
  ctx.arc(740, 120, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#10122a';
  const skyline = [[0, 420, 120, 180], [110, 380, 90, 220], [190, 430, 140, 170], [320, 360, 100, 240], [700, 400, 120, 200], [810, 360, 150, 240]];
  for (const [x, y, w, h] of skyline) ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255, 214, 92, 0.5)';
  for (let i = 0; i < 40; i += 1) {
    const wx = 20 + ((i * 173) % 900);
    const wy = 380 + ((i * 97) % 180);
    ctx.fillRect(wx, wy, 5, 7);
  }
  text(ctx, 'VELVET HOUR', VIEW.width / 2, 190, 64, PALETTE.text, 'center', 800, 'Georgia, serif');
  text(ctx, 'Five heists. One night. No noise.', VIEW.width / 2, 242, 17, PALETTE.gold, 'center', 500, 'Georgia, serif');
  text(ctx, 'Read the cones. Mind the sound. Take the target and walk out like the night itself.',
    VIEW.width / 2, 292, 13, PALETTE.dim, 'center', 500);
  const btn = button(ctx, VIEW.width / 2 - 130, 330, 260, 48, 'BEGIN THE NIGHT');
  text(ctx, 'WASD / arrows — move      SHIFT — run (loud)      1/2/3 — tools      M — mute',
    VIEW.width / 2, 420, 12, PALETTE.dim, 'center', 500);
  text(ctx, 'Shadow hides you. Light exposes you. A running thief is a heard thief.',
    VIEW.width / 2, 446, 12, PALETTE.dim, 'center', 500);
  return { buttons: [{ id: 'begin', ...btn }] };
}

function drawMinimap(ctx, x, y, w, h, heist) {
  const sx = w / VIEW.width;
  const sy = h / VIEW.height;
  ctx.fillStyle = PALETTE.floorA;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.wallTop;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  const px = (vx) => x + vx * sx;
  const py = (vy) => y + vy * sy;
  for (const s of heist.shadows) {
    ctx.fillStyle = 'rgba(2, 3, 12, 0.6)';
    ctx.fillRect(px(s.x), py(s.y), s.w * sx, s.h * sy);
  }
  for (const wl of heist.walls) {
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(px(wl.x), py(wl.y), wl.w * sx, wl.h * sy);
  }
  // Patrol routes, dotted amber.
  ctx.strokeStyle = 'rgba(255, 214, 92, 0.85)';
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  for (const g of heist.guards) {
    ctx.beginPath();
    g.patrol.forEach(([gx, gy], i) => {
      if (i === 0) ctx.moveTo(px(gx), py(gy));
      else ctx.lineTo(px(gx), py(gy));
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const c of heist.cameras) {
    ctx.fillStyle = '#ff6e6e';
    ctx.beginPath();
    ctx.arc(px(c.x), py(c.y), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const l of heist.loot) {
    ctx.fillStyle = l.main ? PALETTE.lootMain : PALETTE.loot;
    ctx.beginPath();
    ctx.arc(px(l.x), py(l.y), l.main ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.exit;
  ctx.fillRect(px(heist.exit.x), py(heist.exit.y), heist.exit.w * sx, heist.exit.h * sy);
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(px(heist.start.x), py(heist.start.y), 4, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'PATROLS', x + 8, y + h - 12, 9, PALETTE.gold, 'left', 700);
  text(ctx, 'CAMERAS', x + 78, y + h - 12, 9, '#ff8a8a', 'left', 700);
  text(ctx, 'LOOT', x + 158, y + h - 12, 9, PALETTE.loot, 'left', 700);
}

export function drawPlan(ctx, game) {
  const heist = HEISTS[game.heistIndex];
  ctx.fillStyle = '#070812';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'THE PLAN', 48, 52, 30, PALETTE.text, 'left', 800, 'Georgia, serif');
  text(ctx, `Heist ${game.heistIndex + 1} of 5 — ${heist.name}`, 48, 84, 15, PALETTE.gold, 'left', 600);
  text(ctx, heist.sub, 48, 106, 12, PALETTE.dim, 'left', 500);
  text(ctx, `Target: ${heist.target}      Par: ${Math.floor(heist.par / 60)}:${String(heist.par % 60).padStart(2, '0')}      Guards: ${heist.guards.length}      Cameras: ${heist.cameras.length}      Lasers: ${heist.lasers.length}`,
    48, 130, 12, PALETTE.text, 'left', 600);
  drawMinimap(ctx, 48, 152, 420, 262, heist);
  // Tool shop.
  text(ctx, 'TOOLS — spend coins before you go in', 508, 168, 13, PALETTE.text, 'left', 700);
  const shopButtons = [];
  const keys = ['smoke', 'decoy', 'pick'];
  keys.forEach((key, i) => {
    const tool = TOOLS[key];
    const y = 188 + i * 76;
    const owned = game.loadout.tools[key];
    const afford = game.loadout.coins >= tool.cost;
    ctx.fillStyle = '#12142e';
    rr(ctx, 508, y, 404, 64, 8);
    ctx.fill();
    ctx.strokeStyle = owned > 0 ? PALETTE.gold : '#2a2d4a';
    ctx.lineWidth = 1;
    rr(ctx, 508, y, 404, 64, 8);
    ctx.stroke();
    text(ctx, `[${tool.key}] ${tool.name} — ${tool.cost} coin${tool.cost > 1 ? 's' : ''}  (owned ×${owned})`, 522, y + 20, 13, PALETTE.text, 'left', 700);
    text(ctx, tool.blurb, 522, y + 42, 11, PALETTE.dim, 'left', 500);
    const buy = button(ctx, 824, y + 16, 74, 32, afford ? 'BUY' : '—', afford);
    shopButtons.push({ id: `buy-${key}`, ...buy });
  });
  text(ctx, `Your coins: ◉ ${game.loadout.coins}`, 508, 428, 13, PALETTE.gold, 'left', 700);
  const begin = button(ctx, 508, 452, 404, 48, 'BEGIN THE HEIST');
  text(ctx, 'Study the patrols. Every room has more than one way through.',
    48, 452, 12, PALETTE.dim, 'left', 500);
  return { buttons: [...shopButtons, { id: 'begin-heist', ...begin }] };
}

export function drawCaught(ctx, game) {
  ctx.fillStyle = 'rgba(20, 4, 8, 0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 230, 150, 500, 300);
  text(ctx, 'CAUGHT', VIEW.width / 2, 210, 44, PALETTE.alarm, 'center', 800, 'Georgia, serif');
  text(ctx, 'The alarm hit 100. The house wakes up, and the night is over — for this room.',
    VIEW.width / 2, 258, 13, PALETTE.text, 'center', 500);
  text(ctx, `Loot kept: $${game.world.score}   ·   Time: ${Math.floor(game.world.time)}s`,
    VIEW.width / 2, 292, 12, PALETTE.dim, 'center', 600);
  const retry = button(ctx, VIEW.width / 2 - 110, 330, 220, 46, 'TRY THE ROOM AGAIN');
  text(ctx, 'The guards reset. Your coins and tools stay with you.',
    VIEW.width / 2, 412, 11, PALETTE.dim, 'center', 500);
  return { buttons: [{ id: 'retry', ...retry }] };
}

export function drawGetaway(ctx, game, breakdown) {
  ctx.fillStyle = 'rgba(4, 10, 6, 0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 230, 110, 500, 380);
  text(ctx, 'CLEAN GETAWAY', VIEW.width / 2, 168, 36, PALETTE.exit, 'center', 800, 'Georgia, serif');
  text(ctx, `Rating: ${breakdown.rating}`, VIEW.width / 2, 208, 15, PALETTE.gold, 'center', 700);
  const rows = [
    ['Loot', breakdown.loot],
    ['Time bonus', breakdown.timeBonus],
    ['Ghost bonus', breakdown.ghostBonus],
    ['Completion', breakdown.completion],
  ];
  rows.forEach(([label, value], i) => {
    text(ctx, label, 290, 248 + i * 28, 13, PALETTE.text, 'left', 600);
    text(ctx, `$${value}`, 670, 248 + i * 28, 13, PALETTE.text, 'right', 700);
  });
  ctx.strokeStyle = PALETTE.wallTop;
  ctx.beginPath();
  ctx.moveTo(290, 368);
  ctx.lineTo(670, 368);
  ctx.stroke();
  text(ctx, 'Heist total', 290, 392, 14, PALETTE.text, 'left', 700);
  text(ctx, `$${breakdown.total}`, 670, 392, 14, PALETTE.gold, 'right', 800);
  text(ctx, `Night total so far: $${game.totalScore}`, VIEW.width / 2, 424, 12, PALETTE.dim, 'center', 600);
  const next = button(ctx, VIEW.width / 2 - 110, 444, 220, 46,
    game.heistIndex >= 4 ? 'SEE THE NIGHT' : 'NEXT HEIST');
  return { buttons: [{ id: 'next', ...next }] };
}

export function drawWin(ctx, game) {
  ctx.fillStyle = '#070812';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#f0e6c8';
  ctx.beginPath();
  ctx.arc(740, 120, 34, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'THE VELVET HOUR IS YOURS', VIEW.width / 2, 180, 40, PALETTE.text, 'center', 800, 'Georgia, serif');
  text(ctx, 'Five rooms. Five targets. The city never knew you were there.',
    VIEW.width / 2, 228, 15, PALETTE.gold, 'center', 500, 'Georgia, serif');
  text(ctx, `Final score: $${game.totalScore}`, VIEW.width / 2, 290, 22, PALETTE.loot, 'center', 800);
  text(ctx, `Overall rating: ${game.finalRating}`, VIEW.width / 2, 324, 15, PALETTE.text, 'center', 700);
  const again = button(ctx, VIEW.width / 2 - 110, 370, 220, 46, 'RUN THE NIGHT AGAIN');
  return { buttons: [{ id: 'again', ...again }] };
}
