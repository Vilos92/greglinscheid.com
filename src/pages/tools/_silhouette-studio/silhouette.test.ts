import {describe, expect, it} from 'vitest';

import {emitCombinedSvg, emitFlatSvg, emitShadedSvg} from './emit';
import type {Mat3, RawPrimitive} from './geometry';
import {buildMesh, LOCKED_AXES, LOCKED_ORIENTATION, projectAndCull, projectShaded} from './geometry';

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

  it('decimates faces toward a target budget', () => {
    const mesh = buildMesh([cube], '+X', '+Z', 4);
    expect(mesh.faces.length).toBeLessThan(12);
    expect(mesh.faces.length).toBeGreaterThan(0);
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

  it('emits a single-path 512 viewBox SVG with currentColor by default', () => {
    const svg = emitFlatSvg(scene, {ariaHidden: true, useColorVar: false});
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('fill="currentColor"');
    expect(svg.match(/<path/g)).toHaveLength(1);
  });

  it('switches to the icon-color variable when requested', () => {
    const svg = emitFlatSvg(scene, {ariaHidden: true, useColorVar: true});
    expect(svg).toContain('fill="var(--icon-color, currentColor)"');
  });

  it('adds role and a title element for a labelled icon', () => {
    const svg = emitFlatSvg(scene, {ariaHidden: false, title: 'Ship <icon>', useColorVar: false});
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title>Ship &lt;icon&gt;</title>');
    expect(svg).not.toContain('aria-hidden');
  });

  it('is deterministic for the same scene and options', () => {
    const options = {ariaHidden: true, useColorVar: false} as const;
    expect(emitFlatSvg(scene, options)).toBe(emitFlatSvg(scene, options));
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

  it('emits stacked currentColor paths with per-band opacity', () => {
    const svg = emitShadedSvg(projectShaded(mesh, LOCKED_ORIENTATION), {
      ariaHidden: true,
      useColorVar: false
    });
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('fill-opacity=');
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThan(1);
  });

  it('combined mode layers a translucent flat base under the bands', () => {
    const svg = emitCombinedSvg(
      projectAndCull(mesh, LOCKED_ORIENTATION),
      projectShaded(mesh, LOCKED_ORIENTATION),
      {ariaHidden: true, useColorVar: false}
    );
    expect(svg).toContain('fill-opacity="0.6"');
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThan(1);
  });
});
