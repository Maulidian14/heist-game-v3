// VELVET HOUR — stealth geometry: vision cones, line of sight, shadow and
// noise. Pure functions over the room data; world.js calls them each step and
// render.js calls them to draw the cones the player must read.
import { TUNING } from './config.js';

export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Is the point inside the cone from (ox,oy) facing `dir` with range and half-angle?
export function inCone(x, y, ox, oy, dir, range, halfAngle) {
  const d = dist(x, y, ox, oy);
  if (d > range) return false;
  if (d < 4) return true;
  return Math.abs(angleDiff(Math.atan2(y - oy, x - ox), dir)) <= halfAngle;
}

// Does the segment from (x1,y1) to (x2,y2) cross any wall? Walls block sight
// (and laser beams), so cones never see through them.
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

export function losBlocked(x1, y1, x2, y2, walls, doors) {
  for (const w of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return true;
  }
  for (const d of doors || []) {
    if (d.locked && segmentHitsRect(x1, y1, x2, y2, d)) return true;
  }
  return false;
}

// Is the point inside any shadow zone? Shadow halves a cone's reach and halves
// how fast the alarm rises — the thief's best friend.
export function pointInShadow(x, y, shadows) {
  for (const s of shadows) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

// Is the point inside any smoke cloud? Smoke blinds cones completely.
export function pointInSmoke(x, y, smokes) {
  for (const s of smokes) {
    if (dist(x, y, s.x, s.y) <= s.r) return true;
  }
  return false;
}

// Can this watcher (guard or camera) see the thief right now? Returns the
// detection strength 0..1 (0 = unseen). Shadow shrinks the range; smoke blocks.
export function watcherSees(watcher, thief, walls, doors, shadows, smokes) {
  const inShadow = pointInShadow(thief.x, thief.y, shadows);
  const range = watcher.range * (inShadow ? TUNING.shadowRangeFactor : 1);
  if (!inCone(thief.x, thief.y, watcher.x, watcher.y, watcher.dir, range, watcher.halfAngle)) return 0;
  if (losBlocked(watcher.x, watcher.y, thief.x, thief.y, walls, doors)) return 0;
  if (pointInSmoke(thief.x, thief.y, smokes)) return 0;
  const d = dist(thief.x, thief.y, watcher.x, watcher.y);
  const closeness = 1 - (d / watcher.range) * 0.5;
  return inShadow ? closeness * 0.55 : closeness;
}

// The cone's polygon for drawing: an arc of points from the watcher's position.
export function conePoints(ox, oy, dir, range, halfAngle, steps = 14) {
  const pts = [[ox, oy]];
  for (let i = 0; i <= steps; i += 1) {
    const a = dir - halfAngle + (2 * halfAngle * i) / steps;
    pts.push([ox + Math.cos(a) * range, oy + Math.sin(a) * range]);
  }
  return pts;
}

// Distance from a point to a segment (for lasers and for the autopilot).
export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}

// Circle-vs-rectangle collision resolve: push the circle out of the rect.
export function pushOutOfRect(px, py, r, rect) {
  const cx = Math.max(rect.x, Math.min(px, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(py, rect.y + rect.h));
  const dx = px - cx;
  const dy = py - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 === 0) return { x: px, y: rect.y - r };
  const d = Math.sqrt(d2);
  return { x: cx + (dx / d) * r, y: cy + (dy / d) * r };
}
