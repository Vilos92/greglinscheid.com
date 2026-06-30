/*
 * Types.
 */

export type AxisToken = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';

export type RawPrimitive = {
  positions: ArrayLike<number>;
  indices?: ArrayLike<number>;
  worldMatrix: ArrayLike<number>;
};

export type Vec3 = [number, number, number];
export type Mat3 = [Vec3, Vec3, Vec3];
export type Vec2 = [number, number];

export type LoadedMesh = {vertices: Vec3[]; faces: [number, number, number][]};
export type CulledScene = {visible: VisibleFace[]; centered: Vec2[]};

// Front-facing triangles tagged with a 0..1 Lambert shade for the cel-shaded output.
export type ShadedFace = {tri: [number, number, number]; shade: number};
export type ShadedScene = {centered: Vec2[]; faces: ShadedFace[]};

type VisibleFace = {
  tri: [number, number, number];
};

/*
 * Constants.
 */

/**
 * Head-on scan camera, looking down the model's forward axis (+X canonical). Being
 * axis-aligned makes the world frame match the screen, so the X/Y/Z pose sliders
 * read relative to what the viewer sees. The viewport shares this exact position.
 */
export const CAMPOS: Vec3 = [8, 0, 0];
const FIT_PX = 430;

/** Light for the cel-shaded output: high, to the left, toward the viewer. */
const LIGHT: Vec3 = normalize([-3, -5, 7]);

export const CANVAS = 512;

/** Default forward/up axis remap for the bundled ship. */
export const LOCKED_AXES: {forward: AxisToken; up: AxisToken} = {forward: '-X', up: '+Y'};

/**
 * Default load pose: a gentle 3/4 view, reached from head-on by turning about the
 * screen-up axis (world Z) and tilting about the screen-right axis (world Y).
 */
export const LOCKED_ORIENTATION: Mat3 = multiplyMat(
  rotationAboutAxis([0, 0, 1], (-35 * Math.PI) / 180),
  rotationAboutAxis([0, 1, 0], (28 * Math.PI) / 180)
);

const AX: Record<AxisToken, Vec3> = {
  '+X': [1, 0, 0],
  '-X': [-1, 0, 0],
  '+Y': [0, 1, 0],
  '-Y': [0, -1, 0],
  '+Z': [0, 0, 1],
  '-Z': [0, 0, -1]
};

/**
 * Grids tried fine→coarse: the finest that fits the budget wins. Dropping every
 * Nth face (the naive approach) scatters the surface and punches holes in the
 * silhouette union. Welding vertices onto a grid keeps the surface continuous.
 */
const CLUSTER_GRIDS = [128, 96, 64, 48, 32, 24, 16, 12, 8];

/** Build a normalized, pose-independent mesh from raw primitives. */
export function buildMesh(
  primitives: readonly RawPrimitive[],
  forward: AxisToken,
  up: AxisToken,
  targetFaces: number
): LoadedMesh {
  const rawVertices: Vec3[] = [];
  const rawFaces: [number, number, number][] = [];
  for (const primitive of primitives) {
    accumulatePrimitive(primitive, rawVertices, rawFaces);
  }

  if (rawVertices.length === 0 || rawFaces.length === 0) {
    throw new Error('No mesh geometry found');
  }

  const remap = remapMatrix(forward, up);
  const remapped = rawVertices.map(vertex => multiplyRowByMatTranspose(vertex, remap));
  const centroid = mean(remapped);
  const centered = remapped.map(vertex => subtract(vertex, centroid));
  let maxAbs = 0;
  for (const vertex of centered) {
    maxAbs = Math.max(maxAbs, Math.abs(vertex[0]), Math.abs(vertex[1]), Math.abs(vertex[2]));
  }
  const normalizeScale = maxAbs === 0 ? 1 : 5 / maxAbs;
  const normalized = centered.map(vertex => scale(vertex, normalizeScale));

  return simplifyMesh(normalized, rawFaces, targetFaces);
}

/** Project a mesh under an orientation into fitted canvas space. */
export function projectAndCull(mesh: LoadedMesh, orientation: Mat3): CulledScene {
  const {visible, centered} = project(mesh, orientation);
  return {visible, centered};
}

/** Project front faces tagged with a Lambert shade for the cel-shaded output. */
export function projectShaded(mesh: LoadedMesh, orientation: Mat3): ShadedScene {
  const {posed, centered} = project(mesh, orientation);
  const viewForward = normalize(scale(CAMPOS, -1));

  const faces: ShadedFace[] = [];
  for (const tri of mesh.faces) {
    const points = tri.map(i => posed[i]);
    const center = mean(points);
    let normal = cross(subtract(points[1], points[0]), subtract(points[2], points[0]));
    const normalLength = length(normal);
    if (normalLength < 1e-12) {
      continue;
    }
    normal = scale(normal, 1 / normalLength);
    if (dot(normal, center) < 0) {
      normal = scale(normal, -1);
    }
    if (dot(normal, viewForward) >= 0) {
      continue;
    }
    faces.push({tri, shade: Math.max(0, dot(normal, LIGHT))});
  }

  return {centered, faces};
}

/** Shared projection + canvas fit used by both the flat and shaded outputs. */
function project(
  mesh: LoadedMesh,
  orientation: Mat3
): {posed: Vec3[]; visible: VisibleFace[]; centered: Vec2[]} {
  const posed = mesh.vertices.map(vertex => multiplyRowByMatTranspose(vertex, orientation));

  const viewForward = normalize(scale(CAMPOS, -1));
  const upAxis: Vec3 = [0, 0, 1];
  const right = normalize(cross(viewForward, upAxis));
  const up = normalize(cross(right, viewForward));

  const projected = posed.map(vertex => {
    const x = dot(vertex, right);
    const y = -dot(vertex, up);
    return [x, y] satisfies Vec2;
  });

  const visible = collectVisibleFaces(mesh.faces, posed);

  const fitPoints = visible.flatMap(face => face.tri.map(i => projected[i]));
  const {mn, mx} = boundsOf(fitPoints);
  const span = Math.max(mx[0] - mn[0], mx[1] - mn[1]) || 1;
  const scaleFactor = FIT_PX / span;
  const offset: Vec2 = [
    CANVAS / 2 - ((mn[0] + mx[0]) / 2) * scaleFactor,
    CANVAS / 2 - ((mn[1] + mx[1]) / 2) * scaleFactor
  ];

  const centered = projected.map(
    ([x, y]) => [x * scaleFactor + offset[0], y * scaleFactor + offset[1]] satisfies Vec2
  );

  return {posed, visible, centered};
}

/*
 * Helpers.
 */

/** Axis-aligned bounds of a point set; looped to stay safe on very large meshes. */
function boundsOf(points: readonly Vec2[]): {mn: Vec2; mx: Vec2} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {mn: [minX, minY], mx: [maxX, maxY]};
}

/**
 * A primitive's faces index into its own vertices, so offset them by the running
 * vertex count when merging everything into the shared vertex and face lists.
 */
function accumulatePrimitive(
  primitive: RawPrimitive,
  rawVertices: Vec3[],
  rawFaces: [number, number, number][]
): void {
  const {positions, indices, worldMatrix: m} = primitive;
  const vertexOffset = rawVertices.length;
  const vertexCount = positions.length / 3;

  for (let i = 0; i < vertexCount; i++) {
    const localX = positions[i * 3];
    const localY = positions[i * 3 + 1];
    const localZ = positions[i * 3 + 2];
    rawVertices.push([
      m[0] * localX + m[4] * localY + m[8] * localZ + m[12],
      m[1] * localX + m[5] * localY + m[9] * localZ + m[13],
      m[2] * localX + m[6] * localY + m[10] * localZ + m[14]
    ]);
  }

  if (indices === undefined) {
    for (let i = 0; i + 2 < vertexCount; i += 3) {
      rawFaces.push([vertexOffset + i, vertexOffset + i + 1, vertexOffset + i + 2]);
    }
    return;
  }

  for (let i = 0; i + 2 < indices.length; i += 3) {
    rawFaces.push([vertexOffset + indices[i], vertexOffset + indices[i + 1], vertexOffset + indices[i + 2]]);
  }
}

/** A budget of 0 (or an already-small mesh) keeps every face untouched. */
function simplifyMesh(vertices: Vec3[], faces: [number, number, number][], targetFaces: number): LoadedMesh {
  if (targetFaces <= 0 || faces.length <= targetFaces) {
    return {vertices, faces};
  }
  const {mn, extent} = bounds3(vertices);
  let coarsest = clusterMesh(vertices, faces, mn, extent, CLUSTER_GRIDS[0]);
  for (const grid of CLUSTER_GRIDS) {
    coarsest = clusterMesh(vertices, faces, mn, extent, grid);
    if (coarsest.faces.length <= targetFaces) {
      return coarsest;
    }
  }
  return coarsest;
}

/**
 * Weld every vertex to its grid cell (cell centroid is the new vertex), then
 * rebuild faces against those cells, dropping triangles that collapse to a line.
 */
function clusterMesh(
  vertices: Vec3[],
  faces: [number, number, number][],
  mn: Vec3,
  extent: Vec3,
  grid: number
): LoadedMesh {
  const cellIndex = new Map<number, number>();
  const sums: Vec3[] = [];
  const counts: number[] = [];
  const vertexCell = new Int32Array(vertices.length);

  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    const ix = cellAxis(v[0], mn[0], extent[0], grid);
    const iy = cellAxis(v[1], mn[1], extent[1], grid);
    const iz = cellAxis(v[2], mn[2], extent[2], grid);
    const key = ix + iy * grid + iz * grid * grid;
    let idx = cellIndex.get(key);
    if (idx === undefined) {
      idx = sums.length;
      cellIndex.set(key, idx);
      sums.push([0, 0, 0]);
      counts.push(0);
    }
    vertexCell[i] = idx;
    sums[idx][0] += v[0];
    sums[idx][1] += v[1];
    sums[idx][2] += v[2];
    counts[idx] += 1;
  }

  const newVertices = sums.map((sum, i) => scale(sum, 1 / counts[i]));
  const newFaces: [number, number, number][] = [];
  const seen = new Set<string>();
  for (const tri of faces) {
    const a = vertexCell[tri[0]];
    const b = vertexCell[tri[1]];
    const c = vertexCell[tri[2]];
    if (a === b || b === c || a === c) {
      continue;
    }
    const sorted = [a, b, c].sort((p, q) => p - q);
    const key = `${sorted[0]}_${sorted[1]}_${sorted[2]}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    newFaces.push([a, b, c]);
  }
  return {vertices: newVertices, faces: newFaces};
}

function cellAxis(value: number, min: number, extent: number, grid: number): number {
  return Math.min(grid - 1, Math.max(0, Math.floor(((value - min) / extent) * grid)));
}

function bounds3(vertices: readonly Vec3[]): {mn: Vec3; extent: Vec3} {
  const mn: Vec3 = [Infinity, Infinity, Infinity];
  const mx: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const v of vertices) {
    for (let axis = 0; axis < 3; axis++) {
      mn[axis] = Math.min(mn[axis], v[axis]);
      mx[axis] = Math.max(mx[axis], v[axis]);
    }
  }
  // Guard zero-thickness axes (flat meshes) so the division stays finite.
  const extent: Vec3 = [mx[0] - mn[0] || 1, mx[1] - mn[1] || 1, mx[2] - mn[2] || 1];
  return {mn, extent};
}

function remapMatrix(forward: AxisToken, up: AxisToken): Mat3 {
  const fwd = AX[forward];
  const upVector = AX[up];
  const right = cross(fwd, upVector);
  return [fwd, right, upVector];
}

/** Rodrigues rotation matrix R for a CCW turn of `angle` about a unit `axis`. */
function rotationAboutAxis(axis: Vec3, angle: number): Mat3 {
  const [x, y, z] = axis;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c]
  ];
}

/**
 * The silhouette is the union of all projected faces, so keep every face that has
 * real area — front and back both fill the outline.
 */
function collectVisibleFaces(faces: [number, number, number][], posed: Vec3[]): VisibleFace[] {
  const visible: VisibleFace[] = [];

  for (const tri of faces) {
    const points = tri.map(i => posed[i]);
    const normal = cross(subtract(points[1], points[0]), subtract(points[2], points[0]));
    if (length(normal) < 1e-12) {
      continue;
    }
    visible.push({tri});
  }

  return visible;
}

function multiplyRowByMatTranspose(vector: Vec3, matrix: Mat3): Vec3 {
  return [
    vector[0] * matrix[0][0] + vector[1] * matrix[0][1] + vector[2] * matrix[0][2],
    vector[0] * matrix[1][0] + vector[1] * matrix[1][1] + vector[2] * matrix[1][2],
    vector[0] * matrix[2][0] + vector[1] * matrix[2][1] + vector[2] * matrix[2][2]
  ];
}

function multiplyMat(left: Mat3, right: Mat3): Mat3 {
  return [
    [
      left[0][0] * right[0][0] + left[0][1] * right[1][0] + left[0][2] * right[2][0],
      left[0][0] * right[0][1] + left[0][1] * right[1][1] + left[0][2] * right[2][1],
      left[0][0] * right[0][2] + left[0][1] * right[1][2] + left[0][2] * right[2][2]
    ],
    [
      left[1][0] * right[0][0] + left[1][1] * right[1][0] + left[1][2] * right[2][0],
      left[1][0] * right[0][1] + left[1][1] * right[1][1] + left[1][2] * right[2][1],
      left[1][0] * right[0][2] + left[1][1] * right[1][2] + left[1][2] * right[2][2]
    ],
    [
      left[2][0] * right[0][0] + left[2][1] * right[1][0] + left[2][2] * right[2][0],
      left[2][0] * right[0][1] + left[2][1] * right[1][1] + left[2][2] * right[2][1],
      left[2][0] * right[0][2] + left[2][1] * right[1][2] + left[2][2] * right[2][2]
    ]
  ];
}

function mean(vectors: Vec3[]): Vec3 {
  const sum: Vec3 = [0, 0, 0];
  for (const vector of vectors) {
    sum[0] += vector[0];
    sum[1] += vector[1];
    sum[2] += vector[2];
  }
  return scale(sum, 1 / vectors.length);
}

function subtract(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function scale(vector: Vec3, factor: number): Vec3 {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

function dot(left: Vec3, right: Vec3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ];
}

function length(vector: Vec3): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalize(vector: Vec3): Vec3 {
  const len = length(vector);
  return len === 0 ? [0, 0, 0] : scale(vector, 1 / len);
}
