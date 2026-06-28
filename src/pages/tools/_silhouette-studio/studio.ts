import type * as THREE from 'three';

import type {EmitOptions} from './emit';
import type {AxisToken, LoadedMesh, Mat3, RawPrimitive} from './geometry';
import type {WorkerReply, WorkerRequest} from './protocol';

import {ids} from './studio.css';

/*
 * Types.
 */

type ThreeModule = typeof THREE;

type GeometryModule = typeof import('./geometry');

type Viewport = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  group: THREE.Group;
  display: THREE.Mesh | undefined;
};

/*
 * Constants.
 */

const DEFAULT_MODEL_URL = '/models/spaceship-fighter.glb';

const ANGLE_LIMIT = 180;

const SNAP_STEP = 15;

// Cap clipper work for very large dropped meshes; the sample ship (~11.5k) stays full.
const FACE_BUDGET = 20000;

/*
 * Script.
 */

if (document.getElementById(ids.viewport)?.closest('[data-studio-root]') instanceof HTMLElement) {
  initStudio();
}

/*
 * Hooks.
 */

/**
 * Wire the Silhouette Studio page: drop/pose/preview/export.
 * @sideEffect Registers DOM events, fetches the default model, mutates the page.
 */
function initStudio(): void {
  const viewportEl = requireElement<HTMLDivElement>(ids.viewport);
  const canvasEl = requireElement<HTMLCanvasElement>(ids.canvas);
  const dropZoneEl = requireElement<HTMLDivElement>(ids.dropZone);
  const fileInputEl = requireElement<HTMLInputElement>(ids.fileInput);
  const statusEl = requireElement<HTMLParagraphElement>(ids.status);
  const previewEl = requireElement<HTMLDivElement>(ids.preview);

  const bankRange = requireElement<HTMLInputElement>(ids.bank);
  const pitchRange = requireElement<HTMLInputElement>(ids.pitch);
  const spinRange = requireElement<HTMLInputElement>(ids.spin);
  const bankNumber = requireElement<HTMLInputElement>(ids.bankNumber);
  const pitchNumber = requireElement<HTMLInputElement>(ids.pitchNumber);
  const spinNumber = requireElement<HTMLInputElement>(ids.spinNumber);

  const snapToggle = requireElement<HTMLInputElement>(ids.snap);
  const resetButton = requireElement<HTMLButtonElement>(ids.reset);
  const presetButton = requireElement<HTMLButtonElement>(ids.preset);
  const forwardSelect = requireElement<HTMLSelectElement>(ids.forward);
  const upSelect = requireElement<HTMLSelectElement>(ids.up);

  const colorInput = requireElement<HTMLInputElement>(ids.color);
  const opacityRange = requireElement<HTMLInputElement>(ids.opacity);
  const useVarToggle = requireElement<HTMLInputElement>(ids.useVar);
  const ariaHiddenToggle = requireElement<HTMLInputElement>(ids.ariaHidden);
  const titleInput = requireElement<HTMLInputElement>(ids.title);
  const downloadButton = requireElement<HTMLButtonElement>(ids.download);

  const snippetInline = requireElement<HTMLElement>(ids.snippetInline);
  const snippetMask = requireElement<HTMLElement>(ids.snippetMask);
  const copyInlineButton = requireElement<HTMLButtonElement>(ids.copyInline);
  const copyMaskButton = requireElement<HTMLButtonElement>(ids.copyMask);

  let forward: AxisToken = '-X';
  let up: AxisToken = '+Y';

  // Canonical pose: one model-orientation quaternion, created once three loads.
  let orientation: THREE.Quaternion | undefined;

  let geometry: GeometryModule | undefined;
  let three: ThreeModule | undefined;
  let primitives: readonly RawPrimitive[] | undefined;
  let mesh: LoadedMesh | undefined;
  let viewport: Viewport | undefined;
  let currentSvg = '';

  // The clipper silhouette runs in a worker; coalesce so only the freshest
  // pose is ever in flight and stale replies are dropped.
  let worker: Worker | undefined;
  let isWorkerBusy = false;
  let hasQueuedEmit = false;
  let requestSeq = 0;
  let latestRequestId = 0;

  /*
   * Loading.
   */

  /** @sideEffect Async dynamic import of the clipper-free geometry module. */
  async function ensureGeometry(): Promise<GeometryModule> {
    if (geometry === undefined) {
      geometry = await import('./geometry');
    }
    return geometry;
  }

  // Spawn the clipper worker lazily; its chunk carries clipper, not the page.
  function ensureWorker(): Worker {
    if (worker === undefined) {
      worker = new Worker(new URL('./silhouette.worker.ts', import.meta.url), {type: 'module'});
      worker.onmessage = onWorkerMessage;
    }
    return worker;
  }

  /** @sideEffect Network fetch of the default GLB, then loads it. */
  async function loadDefaultModel(): Promise<void> {
    setStatus('Loading model…', false);
    try {
      const response = await fetch(DEFAULT_MODEL_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch model (${response.status})`);
      }
      const buffer = await response.arrayBuffer();
      await loadModel(buffer);
    } catch (error) {
      setStatus(messageFrom(error), true);
    }
  }

  /** @sideEffect Reads a dropped File and loads it. */
  async function loadFile(file: File): Promise<void> {
    setStatus(`Loading ${file.name}…`, false);
    try {
      const buffer = await file.arrayBuffer();
      await loadModel(buffer);
    } catch (error) {
      setStatus(messageFrom(error), true);
    }
  }

  /** @sideEffect Parses the GLB, builds the mesh, and mounts the viewport. */
  async function loadModel(buffer: ArrayBuffer): Promise<void> {
    const [threeModule, gltfLoaderModule, geometryModule] = await Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      ensureGeometry()
    ]);
    three = threeModule;
    ensureWorker();

    const loader = new gltfLoaderModule.GLTFLoader();
    const gltf = await loader.parseAsync(buffer, '');
    primitives = extractPrimitives(gltf.scene);
    rebuildMesh(geometryModule);

    mountViewport(threeModule);
    rebuildDisplay(threeModule);
    dropZoneEl.dataset.hidden = 'true';
    setStatus('', false);
    if (orientation === undefined) {
      orientation = orientationFromMat3(threeModule, geometryModule.LOCKED_ORIENTATION);
    }
    syncControls();
    applyPoseToViewport();
    requestEmit();
  }

  function rebuildMesh(geometryModule: GeometryModule): void {
    if (primitives === undefined) {
      return;
    }
    mesh = geometryModule.buildMesh(primitives, forward, up, FACE_BUDGET);
    if (worker !== undefined) {
      const message: WorkerRequest = {type: 'mesh', mesh};
      worker.postMessage(message);
    }
  }

  /*
   * Viewport.
   */

  function mountViewport(three: ThreeModule): void {
    if (viewport !== undefined) {
      return;
    }

    const renderer = new three.WebGLRenderer({canvas: canvasEl, antialias: true, alpha: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new three.Scene();
    const camera = new three.OrthographicCamera(-6, 6, 6, -6, 0.1, 100);

    const key = new three.DirectionalLight(0xffffff, 2.2);
    key.position.set(-6.2, -3.6, 3.6);
    const fill = new three.HemisphereLight(0xffffff, 0x404040, 1.1);
    scene.add(key, fill);

    const group = new three.Group();
    scene.add(group);

    viewport = {renderer, scene, camera, group, display: undefined};
    resizeViewport();
    new ResizeObserver(resizeViewport).observe(viewportEl);
  }

  function rebuildDisplay(three: ThreeModule): void {
    if (viewport === undefined || mesh === undefined) {
      return;
    }
    disposeDisplay(viewport);

    const {geometry, radius} = buildDisplayGeometry(three, mesh);
    const display = new three.Mesh(geometry, makeDisplayMaterial(three));
    viewport.group.add(display);
    viewport.display = display;
    fitCamera(radius);
  }

  function fitCamera(radius: number): void {
    if (viewport === undefined) {
      return;
    }
    const half = radius * 1.15;
    viewport.camera.left = -half;
    viewport.camera.right = half;
    viewport.camera.top = half;
    viewport.camera.bottom = -half;
    viewport.camera.near = 0.1;
    viewport.camera.far = radius * 8;
    viewport.camera.updateProjectionMatrix();
  }

  function resizeViewport(): void {
    if (viewport === undefined) {
      return;
    }
    const size = Math.max(1, Math.floor(viewportEl.clientWidth));
    viewport.renderer.setSize(size, size, false);
    applyPoseToViewport();
  }

  // The viewport shares the pipeline's fixed scan camera and shows the model
  // under the exact same orientation, so the two panes always agree.
  function applyPoseToViewport(): void {
    if (viewport === undefined || orientation === undefined) {
      return;
    }
    viewport.group.quaternion.copy(orientation);
    viewport.camera.up.set(0, 0, 1);
    viewport.camera.position.set(-6.2, -3.6, 3.6);
    viewport.camera.lookAt(0, 0, 0);
    viewport.renderer.render(viewport.scene, viewport.camera);
  }

  /*
   * Preview + output.
   */

  function emitContext(): {three: ThreeModule; orientation: THREE.Quaternion; worker: Worker} | undefined {
    if (three === undefined || orientation === undefined || worker === undefined) {
      return undefined;
    }
    return {three, orientation, worker};
  }

  // Ask the worker for a fresh silhouette, coalescing while one is in flight.
  function requestEmit(): void {
    const ctx = emitContext();
    if (ctx === undefined) {
      return;
    }
    if (isWorkerBusy) {
      hasQueuedEmit = true;
      return;
    }
    requestSeq += 1;
    latestRequestId = requestSeq;
    isWorkerBusy = true;
    hasQueuedEmit = false;
    const message: WorkerRequest = {
      type: 'emit',
      id: requestSeq,
      orientation: quatToMat3(ctx.three, ctx.orientation),
      options: emitOptions()
    };
    ctx.worker.postMessage(message);
  }

  /** @sideEffect Applies the worker reply and runs the freshest pending request. */
  function onWorkerMessage(event: MessageEvent<WorkerReply>): void {
    isWorkerBusy = false;
    const reply = event.data;
    if (reply.type === 'error') {
      setStatus(reply.message, true);
    } else if (reply.id === latestRequestId) {
      applySvg(reply.svg);
    }
    if (hasQueuedEmit) {
      requestEmit();
    }
  }

  function applySvg(svg: string): void {
    currentSvg = svg;
    previewEl.innerHTML = svg;
    const svgEl = previewEl.querySelector('svg');
    if (svgEl !== null) {
      svgEl.setAttribute('width', '100%');
      svgEl.setAttribute('height', '100%');
    }
    recolorPreview();
    updateSnippets();
  }

  function emitOptions(): EmitOptions {
    const title = titleInput.value.trim();
    return {
      ariaHidden: ariaHiddenToggle.checked,
      title: title.length > 0 ? title : undefined,
      useColorVar: useVarToggle.checked
    };
  }

  // The emitted SVG inherits `currentColor`/`--icon-color`; both are public
  // contract names, so set them as literal custom properties on the host.
  function recolorPreview(): void {
    previewEl.style.color = colorInput.value;
    previewEl.style.setProperty('--icon-color', colorInput.value);
    previewEl.style.opacity = String(Number(opacityRange.value) / 100);
  }

  function updateSnippets(): void {
    snippetInline.textContent = currentSvg.trim();
    snippetMask.textContent = maskSnippet();
  }

  /*
   * Pose controls.
   */

  // Apply an orientation, sync the sliders, redraw, and re-emit.
  function applyOrientation(next: THREE.Quaternion): void {
    orientation = next;
    syncControls();
    applyPoseToViewport();
    requestEmit();
  }

  // Reflect the orientation back onto the Euler sliders (three keeps these in sync).
  function syncControls(): void {
    if (orientation === undefined || three === undefined) {
      return;
    }
    const euler = new three.Euler().setFromQuaternion(orientation, 'XYZ');
    bankRange.value = bankNumber.value = String(wrapAngle(radToDeg(euler.x)));
    pitchRange.value = pitchNumber.value = String(wrapAngle(radToDeg(euler.y)));
    spinRange.value = spinNumber.value = String(wrapAngle(radToDeg(euler.z)));
  }

  function onSliderInput(): void {
    if (three === undefined) {
      return;
    }
    const euler = new three.Euler(
      degToRad(maybeSnap(Number(bankRange.value))),
      degToRad(maybeSnap(Number(pitchRange.value))),
      degToRad(maybeSnap(Number(spinRange.value))),
      'XYZ'
    );
    applyOrientation(new three.Quaternion().setFromEuler(euler));
  }

  function maybeSnap(degrees: number): number {
    return snapToggle.checked ? Math.round(degrees / SNAP_STEP) * SNAP_STEP : degrees;
  }

  function onForwardOrUpChange(): void {
    forward = forwardSelect.value as AxisToken;
    up = upSelect.value as AxisToken;
    if (geometry === undefined || three === undefined) {
      return;
    }
    rebuildMesh(geometry);
    rebuildDisplay(three);
    applyPoseToViewport();
    requestEmit();
  }

  /*
   * Drag (arcball).
   */

  type Drag = {
    pointerId: number;
    start: THREE.Vector3;
    orientation: THREE.Quaternion;
    three: ThreeModule;
    viewport: Viewport;
  };
  let drag: Drag | undefined;

  // Project a pointer onto a virtual unit sphere over the viewport.
  function sphereVector(threeMod: ThreeModule, event: PointerEvent): THREE.Vector3 {
    const rect = viewportEl.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    const radiusSquared = nx * nx + ny * ny;
    const nz = radiusSquared <= 1 ? Math.sqrt(1 - radiusSquared) : 0;
    return new threeMod.Vector3(nx, ny, nz).normalize();
  }

  function onPointerDown(event: PointerEvent): void {
    if (three === undefined || orientation === undefined || viewport === undefined) {
      return;
    }
    drag = {
      pointerId: event.pointerId,
      start: sphereVector(three, event),
      orientation: orientation.clone(),
      three,
      viewport
    };
    viewportEl.dataset.dragging = 'true';
    viewportEl.setPointerCapture(event.pointerId);
  }

  // Rotate the model so the grabbed point tracks the cursor (Shoemake arcball).
  function onPointerMove(event: PointerEvent): void {
    if (drag === undefined || drag.pointerId !== event.pointerId) {
      return;
    }
    const current = sphereVector(drag.three, event);
    const deltaEye = new drag.three.Quaternion().setFromUnitVectors(drag.start, current);
    const camera = drag.viewport.camera.quaternion;
    const deltaWorld = camera.clone().multiply(deltaEye).multiply(camera.clone().invert());
    applyOrientation(deltaWorld.multiply(drag.orientation));
  }

  function onPointerUp(event: PointerEvent): void {
    if (drag === undefined || drag.pointerId !== event.pointerId) {
      return;
    }
    drag = undefined;
    viewportEl.dataset.dragging = 'false';
    viewportEl.releasePointerCapture(event.pointerId);
    if (snapToggle.checked) {
      onSliderInput();
    }
  }

  /*
   * Events.
   */

  bankRange.addEventListener('input', onSliderInput);
  pitchRange.addEventListener('input', onSliderInput);
  spinRange.addEventListener('input', onSliderInput);
  bankNumber.addEventListener('change', onSliderInput);
  pitchNumber.addEventListener('change', onSliderInput);
  spinNumber.addEventListener('change', onSliderInput);

  snapToggle.addEventListener('change', onSliderInput);
  resetButton.addEventListener('click', () => {
    if (three !== undefined) {
      applyOrientation(new three.Quaternion());
    }
  });
  presetButton.addEventListener('click', () => {
    if (geometry === undefined || three === undefined) {
      return;
    }
    forward = geometry.LOCKED_AXES.forward;
    up = geometry.LOCKED_AXES.up;
    forwardSelect.value = forward;
    upSelect.value = up;
    rebuildMesh(geometry);
    rebuildDisplay(three);
    applyOrientation(orientationFromMat3(three, geometry.LOCKED_ORIENTATION));
  });
  forwardSelect.addEventListener('change', onForwardOrUpChange);
  upSelect.addEventListener('change', onForwardOrUpChange);

  colorInput.addEventListener('input', recolorPreview);
  opacityRange.addEventListener('input', recolorPreview);
  useVarToggle.addEventListener('change', requestEmit);
  ariaHiddenToggle.addEventListener('change', () => {
    titleInput.disabled = ariaHiddenToggle.checked;
    requestEmit();
  });
  titleInput.addEventListener('input', requestEmit);
  downloadButton.addEventListener('click', downloadSvg);

  copyInlineButton.addEventListener('click', () =>
    copyText(snippetInline.textContent ?? '', copyInlineButton)
  );
  copyMaskButton.addEventListener('click', () => copyText(snippetMask.textContent ?? '', copyMaskButton));

  viewportEl.addEventListener('pointerdown', onPointerDown);
  viewportEl.addEventListener('pointermove', onPointerMove);
  viewportEl.addEventListener('pointerup', onPointerUp);
  viewportEl.addEventListener('pointercancel', onPointerUp);

  dropZoneEl.addEventListener('click', () => fileInputEl.click());
  fileInputEl.addEventListener('change', () => {
    const file = fileInputEl.files?.[0];
    if (file !== undefined) {
      void loadFile(file);
    }
  });

  viewportEl.addEventListener('dragover', event => {
    event.preventDefault();
    dropZoneEl.dataset.hidden = 'false';
    dropZoneEl.dataset.dragover = 'true';
  });
  viewportEl.addEventListener('dragleave', () => {
    dropZoneEl.dataset.dragover = 'false';
    if (mesh !== undefined) {
      dropZoneEl.dataset.hidden = 'true';
    }
  });
  viewportEl.addEventListener('drop', event => {
    event.preventDefault();
    dropZoneEl.dataset.dragover = 'false';
    const file = event.dataTransfer?.files?.[0];
    if (file !== undefined) {
      void loadFile(file);
    } else if (mesh !== undefined) {
      dropZoneEl.dataset.hidden = 'true';
    }
  });

  /*
   * Bootstrap.
   */

  void loadDefaultModel();

  /*
   * Local helpers.
   */

  /** @sideEffect Triggers a browser download of the current SVG. */
  function downloadSvg(): void {
    if (currentSvg.length === 0) {
      return;
    }
    const blob = new Blob([currentSvg], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'silhouette.svg';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function maskSnippet(): string {
    return [
      '.icon {',
      '  -webkit-mask: url(silhouette.svg) center / contain no-repeat;',
      '  mask: url(silhouette.svg) center / contain no-repeat;',
      '  background-color: currentColor;',
      '  width: 1.5rem;',
      '  height: 1.5rem;',
      '}'
    ].join('\n');
  }

  function setStatus(message: string, isError: boolean): void {
    statusEl.textContent = message;
    statusEl.dataset.error = String(isError);
  }
}

/*
 * Helpers.
 */

function extractPrimitives(scene: THREE.Object3D): RawPrimitive[] {
  scene.updateMatrixWorld(true);
  const primitives: RawPrimitive[] = [];
  scene.traverse(object => {
    const primitive = toPrimitive(object);
    if (primitive !== undefined) {
      primitives.push(primitive);
    }
  });

  if (primitives.length === 0) {
    throw new Error('No mesh geometry found in this file.');
  }
  return primitives;
}

function toPrimitive(object: THREE.Object3D): RawPrimitive | undefined {
  const node = object as THREE.Mesh;
  if (!node.isMesh) {
    return undefined;
  }
  const geometry = node.geometry as THREE.BufferGeometry;
  const position = geometry.getAttribute('position');
  if (position === undefined) {
    return undefined;
  }
  const index = geometry.getIndex();
  return {
    positions: packPositions(position),
    indices: index === null ? undefined : (index.array as ArrayLike<number>),
    worldMatrix: node.matrixWorld.elements
  };
}

// Read x/y/z per vertex so interleaved/normalized attributes deinterleave correctly.
function packPositions(attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): Float32Array {
  const packed = new Float32Array(attribute.count * 3);
  for (let index = 0; index < attribute.count; index++) {
    packed[index * 3] = attribute.getX(index);
    packed[index * 3 + 1] = attribute.getY(index);
    packed[index * 3 + 2] = attribute.getZ(index);
  }
  return packed;
}

function buildDisplayGeometry(
  three: ThreeModule,
  mesh: LoadedMesh
): {geometry: THREE.BufferGeometry; radius: number} {
  const geometry = new three.BufferGeometry();
  const positions = new Float32Array(mesh.vertices.length * 3);
  for (let index = 0; index < mesh.vertices.length; index++) {
    const vertex = mesh.vertices[index];
    positions[index * 3] = vertex[0];
    positions[index * 3 + 1] = vertex[1];
    positions[index * 3 + 2] = vertex[2];
  }
  geometry.setAttribute('position', new three.BufferAttribute(positions, 3));
  geometry.setIndex(mesh.faces.flat());
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return {geometry, radius: geometry.boundingSphere?.radius ?? 6};
}

function makeDisplayMaterial(three: ThreeModule): THREE.MeshStandardMaterial {
  return new three.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.55,
    metalness: 0.1,
    flatShading: true,
    side: three.DoubleSide
  });
}

function disposeDisplay(viewport: Viewport): void {
  if (viewport.display !== undefined) {
    viewport.group.remove(viewport.display);
    viewport.display.geometry.dispose();
  }
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}

function wrapAngle(value: number): number {
  let wrapped = value;
  while (wrapped > ANGLE_LIMIT) {
    wrapped -= 2 * ANGLE_LIMIT;
  }
  while (wrapped < -ANGLE_LIMIT) {
    wrapped += 2 * ANGLE_LIMIT;
  }
  return Math.round(wrapped);
}

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

function radToDeg(value: number): number {
  return (value * 180) / Math.PI;
}

function mat3ToMatrix4(three: ThreeModule, m: Mat3): THREE.Matrix4 {
  return new three.Matrix4().set(
    m[0][0],
    m[0][1],
    m[0][2],
    0,
    m[1][0],
    m[1][1],
    m[1][2],
    0,
    m[2][0],
    m[2][1],
    m[2][2],
    0,
    0,
    0,
    0,
    1
  );
}

function quatToMat3(three: ThreeModule, quaternion: THREE.Quaternion): Mat3 {
  const e = new three.Matrix4().makeRotationFromQuaternion(quaternion).elements;
  return [
    [e[0], e[4], e[8]],
    [e[1], e[5], e[9]],
    [e[2], e[6], e[10]]
  ];
}

function orientationFromMat3(three: ThreeModule, m: Mat3): THREE.Quaternion {
  return new three.Quaternion().setFromRotationMatrix(mat3ToMatrix4(three, m));
}

/** @sideEffect Writes to the clipboard and flashes the button label. */
async function copyText(text: string, button: HTMLButtonElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = 'Copied';
    window.setTimeout(() => {
      button.textContent = original;
    }, 1200);
  } catch {
    button.textContent = 'Copy failed';
  }
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
