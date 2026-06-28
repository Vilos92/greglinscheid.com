import ClipperLib from 'clipper-lib';

import type {CulledScene, Vec2} from './geometry';
import {CANVAS} from './geometry';

/*
 * Types.
 */

export type EmitOptions = {
  ariaHidden: boolean;
  title?: string;
  useColorVar: boolean;
};

/*
 * Constants.
 */

const CLIPPER_SCALE = 10;

/** Emit a single-<path> SVG string from a culled scene. */
export function emitFlatSvg(scene: CulledScene, options: EmitOptions): string {
  const clipper = new ClipperLib.Clipper();

  for (const face of scene.visible) {
    const ring = ensureCounterClockwise(face.tri.map(i => snapPoint(scene.centered[i])));
    if (ringArea(ring) <= 0.05) {
      continue;
    }
    clipper.AddPath(toClipperPath(ring), ClipperLib.PolyType.ptSubject, true);
  }

  const unioned: ClipperLib.Paths = [];
  clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    unioned,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );
  const cleaned = ClipperLib.Clipper.CleanPolygons(unioned, 1);

  const ranked = cleaned
    .map(path => ({path, area: ringArea(fromClipperPath(path))}))
    .sort((a, b) => b.area - a.area);
  const [main] = ranked;
  if (main === undefined) {
    throw new Error('Flat silhouette union produced no paths');
  }

  const ring = fromClipperPath(main.path);
  const buffered = offsetRing(ring, 0.6);
  const contracted = offsetRing(buffered, -0.6);
  const simplified = simplifyRing(contracted, 0.8);
  const recentered = recenterRingToCanvas(simplified);
  if (ringArea(recentered) <= 3) {
    throw new Error('Flat silhouette union produced no paths');
  }

  const fill = options.useColorVar ? 'var(--icon-color, currentColor)' : 'currentColor';
  let attrs = '';
  let titleEl = '';
  if (options.ariaHidden) {
    attrs = ' aria-hidden="true"';
  } else if (options.title !== undefined && options.title !== '') {
    const escaped = options.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    attrs = ' role="img"';
    titleEl = `<title>${escaped}</title>`;
  }

  return `<svg${attrs} viewBox="0 0 ${CANVAS} ${CANVAS}" xmlns="http://www.w3.org/2000/svg">${titleEl}<path fill="${fill}" d="${ringToPath(recentered)}"/></svg>\n`;
}

/*
 * Helpers.
 */

function ensureCounterClockwise(ring: Vec2[]): Vec2[] {
  return signedRingArea(ring) < 0 ? [...ring].reverse() : ring;
}

function offsetRing(ring: Vec2[], distance: number): Vec2[] {
  const path = toClipperPath(ring);
  const offset = offsetClipperPaths([path], distance * CLIPPER_SCALE);
  const [first] = offset;
  if (first === undefined) {
    return ring;
  }
  return fromClipperPath(first);
}

function snapPoint(point: Vec2): Vec2 {
  return [
    Math.round(point[0] * CLIPPER_SCALE) / CLIPPER_SCALE,
    Math.round(point[1] * CLIPPER_SCALE) / CLIPPER_SCALE
  ];
}

function toClipperPath(ring: Vec2[]): ClipperLib.Path {
  return ring.map(([x, y]) => ({X: Math.round(x * CLIPPER_SCALE), Y: Math.round(y * CLIPPER_SCALE)}));
}

function fromClipperPath(path: ClipperLib.Path): Vec2[] {
  return path.map((point): Vec2 => [point.X / CLIPPER_SCALE, point.Y / CLIPPER_SCALE]);
}

function offsetClipperPaths(paths: ClipperLib.Path[], delta: number): ClipperLib.Paths {
  const offsetter = new ClipperLib.ClipperOffset(2, 0.25);
  offsetter.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const solution: ClipperLib.Paths = [];
  offsetter.Execute(solution, delta);
  return solution;
}

function simplifyRing(ring: Vec2[], tolerance: number): Vec2[] {
  if (ring.length <= 3) {
    return ring;
  }
  const closed = [...ring, ring[0]];
  const simplified = douglasPeucker(closed, tolerance);
  return simplified.slice(0, -1);
}

function douglasPeucker(points: Vec2[], tolerance: number): Vec2[] {
  if (points.length <= 2) {
    return points;
  }

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;
  const start = points[0];
  const endPoint = points[end];

  for (let i = 1; i < end; i++) {
    const point = points[i];
    const distance = perpendicularDistance(point, start, endPoint);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, index + 1), tolerance);
    const right = douglasPeucker(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [start, endPoint];
}

function perpendicularDistance(point: Vec2, start: Vec2, end: Vec2): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) {
    return Math.hypot(point[0] - start[0], point[1] - start[1]);
  }
  const t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy);
  const projX = start[0] + t * dx;
  const projY = start[1] + t * dy;
  return Math.hypot(point[0] - projX, point[1] - projY);
}

function recenterRingToCanvas(ring: Vec2[]): Vec2[] {
  const xs = ring.map(p => p[0]);
  const ys = ring.map(p => p[1]);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const dx = CANVAS / 2 - centerX;
  const dy = CANVAS / 2 - centerY;
  return ring.map(([x, y]): Vec2 => [x + dx, y + dy]);
}

function ringToPath(ring: Vec2[]): string {
  const [first, ...rest] = ring;
  if (first === undefined) {
    return '';
  }
  return `M${first[0].toFixed(1)} ${first[1].toFixed(1)} ${rest.map(p => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')} Z`;
}

function ringArea(ring: Vec2[]): number {
  return Math.abs(signedRingArea(ring)) / 2;
}

function signedRingArea(ring: Vec2[]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const current = ring[i];
    const next = ring[(i + 1) % ring.length];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return area;
}
