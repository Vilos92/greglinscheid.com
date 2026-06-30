import {describe, expect, it} from 'vitest';

import {emitFlatSvg, emitShadedSvg} from './emit';
import type {Mat3, RawPrimitive} from './geometry';
import {buildMesh, CAMPOS, LOCKED_AXES, LOCKED_ORIENTATION, projectAndCull, projectShaded} from './geometry';

/*
 * Constants.
 */

// Unit cube spanning [-1, 1] on each axis: 8 corners, 12 triangle faces.
const CUBE_POSITIONS = [-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1];

const CUBE_INDICES = [
  0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2, 0, 4, 5, 0, 5, 1, 3, 2, 6, 3, 6, 7
];

const IDENTITY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

const IDENTITY: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];

const cube: RawPrimitive = {
  positions: CUBE_POSITIONS,
  indices: CUBE_INDICES,
  worldMatrix: IDENTITY_MATRIX
};

/*
 * Tests.
 */

describe('buildMesh', () => {
  it('keeps every vertex and face and normalizes to a 5-unit half-extent', () => {
    const mesh = buildMesh([cube], '+X', '+Z', 0);
    expect(mesh.vertices).toHaveLength(8);
    expect(mesh.faces).toHaveLength(12);
    const maxAbs = Math.max(...mesh.vertices.flatMap(vertex => vertex.map(Math.abs)));
    expect(maxAbs).toBeCloseTo(5);
  });

  it('decimates a dense mesh toward a target budget by welding vertices', () => {
    const dense = gridMesh(40); // 41×41 vertices, 3200 faces
    const mesh = buildMesh([dense], '+X', '+Z', 200);
    expect(mesh.faces.length).toBeLessThan(3200);
    expect(mesh.faces.length).toBeGreaterThan(0);
    // Welding collapses the 41×41 vertex grid onto far fewer cells.
    expect(mesh.vertices.length).toBeLessThan(1681);
  });

  it('throws when no geometry is supplied', () => {
    expect(() => buildMesh([], '+X', '+Z', 0)).toThrow(/no mesh geometry/i);
  });
});

describe('locked pose', () => {
  it('keeps the bundled ship axes and a valid orientation', () => {
    expect(LOCKED_AXES).toEqual({forward: '-X', up: '+Y'});
    expect(LOCKED_ORIENTATION).toHaveLength(3);
  });

  it('scans head-on so the pose sliders stay screen-aligned', () => {
    // Exactly one non-zero component means the camera looks straight down a world
    // axis, so the world frame matches the screen and X/Y/Z read as the viewer sees.
    expect(CAMPOS.filter(component => component !== 0)).toHaveLength(1);
  });
});

describe('projectAndCull', () => {
  it('keeps every non-degenerate face and projects them into canvas space', () => {
    const mesh = buildMesh([cube], '+X', '+Z', 0);
    const scene = projectAndCull(mesh, IDENTITY);
    expect(scene.centered).toHaveLength(8);
    expect(scene.visible).toHaveLength(12);
  });
});

describe('emitFlatSvg', () => {
  const mesh = buildMesh([cube], '+X', '+Z', 0);
  const scene = projectAndCull(mesh, LOCKED_ORIENTATION);

  it('emits a single neutral currentColor path in a 512 viewBox', () => {
    const svg = emitFlatSvg(scene);
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('fill="currentColor"');
    expect(svg).not.toContain('aria-hidden');
    expect(svg).not.toContain('role=');
    expect(svg).not.toContain('<title>');
    expect(svg.match(/<path/g)).toHaveLength(1);
  });

  it('is deterministic for the same scene', () => {
    expect(emitFlatSvg(scene)).toBe(emitFlatSvg(scene));
  });
});

describe('shaded output', () => {
  const mesh = buildMesh([cube], '+X', '+Z', 0);

  it('tags front faces with a 0..1 shade', () => {
    const scene = projectShaded(mesh, LOCKED_ORIENTATION);
    expect(scene.centered).toHaveLength(8);
    expect(scene.faces.length).toBeGreaterThan(0);
    for (const face of scene.faces) {
      expect(face.shade).toBeGreaterThanOrEqual(0);
      expect(face.shade).toBeLessThanOrEqual(1);
    }
  });

  it('layers shade bands over a solid base, all in currentColor', () => {
    const svg = emitShadedSvg(
      projectAndCull(mesh, LOCKED_ORIENTATION),
      projectShaded(mesh, LOCKED_ORIENTATION)
    );
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('fill-opacity="0.6"');
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThan(1);
  });
});

/*
 * Helpers.
 */

// An n×n quad grid of triangles on the z=0 plane: dense, weldable geometry.
function gridMesh(n: number): RawPrimitive {
  const positions: number[] = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      positions.push(i, j, 0);
    }
  }
  const indices: number[] = [];
  const stride = n + 1;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * stride + i;
      indices.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
    }
  }
  return {positions, indices, worldMatrix: IDENTITY_MATRIX};
}
