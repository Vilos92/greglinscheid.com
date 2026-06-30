import ClipperLib from 'clipper-lib';

import type {CulledScene, ShadedScene, Vec2} from './geometry';
import {CANVAS} from './geometry';

/*
 * Types.
 */

export type EmitMode = 'flat' | 'shaded';

/*
 * Constants.
 */

// The output is intentionally minimal: one fill, recolorable via currentColor.
// Accessibility (aria/title/role) is the consumer's call, so we emit none.
const FILL = 'currentColor';

const CLIPPER_SCALE = 10;

// Cel-shaded output: shadow → highlight opacity ramp over fixed bands. The floor
// stays high enough that even the brightest band reads (never near-transparent).
const BAND_OPACITY = [1, 0.85, 0.72, 0.6];
const SHADE_CLOSE = 0.8;
const SHADE_TOLERANCE = 1.2;
const SHADE_MIN_AREA = 10;

// Cel-shaded mode treats the bands as one opacity scale: the lightest step is a
// flat base over the whole silhouette (filling gaps), and every band is
// pre-divided so painting it over the base composites back onto that same scale.
// base + band·(1 − base) = target. The lightest band collapses into the base.
const SHADE_FLOOR = BAND_OPACITY[BAND_OPACITY.length - 1];
const SHADE_BAND_OPACITY = BAND_OPACITY.map(
  target => Math.round(((target - SHADE_FLOOR) / (1 - SHADE_FLOOR)) * 1000) / 1000
);

/** Emit a single-<path> SVG string from a culled scene. */
export function emitFlatSvg(scene: CulledScene): string {
  const recentered = recenterRingToCanvas(flatRing(scene));
  if (ringArea(recentered) <= 3) {
    throw new Error('Flat silhouette union produced no paths');
  }
  return wrapSvg(`<path fill="${FILL}" d="${ringToPath(recentered)}"/>`);
}

/** Emit a cel-shaded SVG: shade bands over a solid base holding the lowest step. */
export function emitShadedSvg(culled: CulledScene, shaded: ShadedScene): string {
  const base = `<path fill="${FILL}" fill-opacity="${SHADE_FLOOR}" d="${ringToPath(flatRing(culled))}"/>`;
  const layers = bandLayers(shaded, SHADE_BAND_OPACITY);
  return wrapSvg(base + layers.join(''));
}

/*
 * Helpers.
 */

// Sort faces into opacity bands, stretching each pose's shade range across the
// full band spread so every angle reads with the same light→dark depth.
function bucketFaces(scene: ShadedScene): Vec2[][][] {
  let minShade = Infinity;
  let maxShade = -Infinity;
  for (const face of scene.faces) {
    minShade = Math.min(minShade, face.shade);
    maxShade = Math.max(maxShade, face.shade);
  }
  const range = maxShade - minShade || 1;

  const buckets: Vec2[][][] = BAND_OPACITY.map(() => []);
  for (const face of scene.faces) {
    const normalized = (face.shade - minShade) / range;
    const band = Math.min(BAND_OPACITY.length - 1, Math.floor(normalized * BAND_OPACITY.length));
    buckets[band].push(face.tri.map(index => scene.centered[index]));
  }
  return buckets;
}

// The single largest flat-silhouette ring (no recentering), shared by the flat
// and combined outputs and aligned with the shaded bands' coordinate space.
function flatRing(scene: CulledScene): Vec2[] {
  const unioned = unionTriangles(scene.visible.map(face => face.tri.map(i => scene.centered[i])));
  const cleaned = ClipperLib.Clipper.CleanPolygons(unioned, 1);
  const ranked = cleaned
    .map(path => ({path, area: ringArea(fromClipperPath(path))}))
    .sort((a, b) => b.area - a.area);
  const [main] = ranked;
  if (main === undefined) {
    throw new Error('Flat silhouette union produced no paths');
  }
  const buffered = offsetRing(fromClipperPath(main.path), 0.6);
  const contracted = offsetRing(buffered, -0.6);
  return simplifyRing(contracted, 0.8);
}

// One <path> per shade band, darkest first; bands at opacity 0 are skipped
// (in combined mode the lightest band is already covered by the base).
function bandLayers(scene: ShadedScene, opacities: readonly number[]): string[] {
  const buckets = bucketFaces(scene);
  const layers: string[] = [];
  for (let band = 0; band < buckets.length; band++) {
    if (opacities[band] <= 0) {
      continue;
    }
    const rings = unionBand(buckets[band]);
    if (rings.length === 0) {
      continue;
    }
    const d = rings.map(ringToIntPath).join(' ');
    layers.push(`<path fill="${FILL}" fill-opacity="${opacities[band]}" d="${d}"/>`);
  }
  return layers;
}

function wrapSvg(body: string): string {
  return `<svg viewBox="0 0 ${CANVAS} ${CANVAS}" xmlns="http://www.w3.org/2000/svg">${body}</svg>\n`;
}

// Non-zero union of triangle rings (snapped to the clipper grid).
function unionTriangles(triangles: readonly Vec2[][]): ClipperLib.Paths {
  const clipper = new ClipperLib.Clipper();
  for (const triangle of triangles) {
    const ring = ensureCounterClockwise(triangle.map(snapPoint));
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
  return unioned;
}

// Union one shade band's triangles, close hairline gaps, simplify, drop specks.
function unionBand(triangles: readonly Vec2[][]): Vec2[][] {
  const grown = offsetClipperPaths(unionTriangles(triangles), SHADE_CLOSE * CLIPPER_SCALE);
  const closed = offsetClipperPaths(grown, -SHADE_CLOSE * CLIPPER_SCALE);
  return closed
    .map(path => simplifyRing(fromClipperPath(path), SHADE_TOLERANCE))
    .filter(ring => ring.length >= 3 && ringArea(ring) >= SHADE_MIN_AREA);
}

function ringToIntPath(ring: Vec2[]): string {
  const [first, ...rest] = ring;
  if (first === undefined) {
    return '';
  }
  return `M${Math.round(first[0])} ${Math.round(first[1])} ${rest.map(p => `L${Math.round(p[0])} ${Math.round(p[1])}`).join(' ')} Z`;
}

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
