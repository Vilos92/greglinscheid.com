import type * as THREE from 'three';

import type {EmitMode} from './emit';
import type {AxisToken, LoadedMesh, Mat3, RawPrimitive, Vec3} from './geometry';
import type {WorkerReply, WorkerRequest} from './protocol';

import {codeAttr, codeString, codeTag, ids, spinner} from './studio.css';

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

type ModelFormat = 'glb' | 'obj' | 'stl';

/*
 * Constants.
 */

const DEFAULT_MODEL_URL = '/models/spaceship-fighter.glb';

const ANGLE_LIMIT = 180;

const SNAP_STEP = 15;

/**
 * Cap clipper work for dense meshes via vertex-welding decimation (not face
 * dropping, which would hole the silhouette). The sample ship (~11.5k) stays full.
 */
const FACE_BUDGET = 20000;

// Idle showcase: drift through poses until the user takes over.
const IDLE_STEPS = 6;
const IDLE_SPEED_RAD = 0.6;
const IDLE_DWELL_MS = 1600;
const IDLE_ARRIVE_RAD = 0.02;

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
 * Wire the 3D to SVG page: drop/pose/preview/export.
 * Registers DOM events, fetches the default model, mutates the page.
 */
function initStudio(): void {
  const viewportEl = requireElement<HTMLDivElement>(ids.viewport);
  const canvasEl = requireElement<HTMLCanvasElement>(ids.canvas);
  const dropZoneEl = requireElement<HTMLDivElement>(ids.dropZone);
  const fileInputEl = requireElement<HTMLInputElement>(ids.fileInput);
  const loadingEl = requireElement<HTMLDivElement>(ids.loading);
  const loadButtonEl = requireElement<HTMLButtonElement>(ids.loadButton);
  const dropErrorEl = requireElement<HTMLParagraphElement>(ids.dropError);
  const liveEl = requireElement<HTMLParagraphElement>(ids.live);
  const previewEl = requireElement<HTMLDivElement>(ids.preview);

  const xRange = requireElement<HTMLInputElement>(ids.x);
  const yRange = requireElement<HTMLInputElement>(ids.y);
  const zRange = requireElement<HTMLInputElement>(ids.z);
  const xNumber = requireElement<HTMLInputElement>(ids.xNumber);
  const yNumber = requireElement<HTMLInputElement>(ids.yNumber);
  const zNumber = requireElement<HTMLInputElement>(ids.zNumber);

  const snapToggle = requireElement<HTMLInputElement>(ids.snap);
  const resetButton = requireElement<HTMLButtonElement>(ids.reset);

  const colorInput = requireElement<HTMLInputElement>(ids.color);
  const modeGroup = requireElement<HTMLElement>(ids.mode);
  const downloadButton = requireElement<HTMLButtonElement>(ids.download);

  const snippetFrameEl = requireElement<HTMLDivElement>(ids.snippetFrame);
  const snippetSpinnerEl = requireElement<HTMLDivElement>(ids.snippetSpinner);
  const snippetInline = requireElement<HTMLElement>(ids.snippetInline);
  const copyInlineButton = requireElement<HTMLButtonElement>(ids.copyInline);

  // Fixed axis remap: glTF is Y-up, so this is a sensible default for any model.
  const forward: AxisToken = '-X';
  const up: AxisToken = '+Y';

  // Canonical pose: one model-orientation quaternion, created once three loads.
  let orientation: THREE.Quaternion | undefined;

  let geometry: GeometryModule | undefined;
  let three: ThreeModule | undefined;
  let primitives: readonly RawPrimitive[] | undefined;
  let mesh: LoadedMesh | undefined;
  let viewport: Viewport | undefined;
  let currentSvg = '';

  // The clipper silhouette runs in a worker. Coalesce so only the freshest
  // pose is ever in flight and stale replies are dropped.
  let worker: Worker | undefined;
  let isWorkerBusy = false;
  let hasQueuedEmit = false;
  let requestSeq = 0;
  let latestRequestId = 0;

  // Idle showcase runs until the first interaction (and never with reduced motion).
  let isIdle = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let idleRaf: number | undefined;
  let idlePhase: 'dwell' | 'move' = 'dwell';
  let idleTargets: THREE.Quaternion[] = [];
  let idleIndex = 0;
  let idleDwellUntil = 0;
  let idleLast = 0;

  /*
   * Loading.
   */

  /** Async dynamic import of the clipper-free geometry module. */
  async function ensureGeometry(): Promise<GeometryModule> {
    if (geometry === undefined) {
      geometry = await import('./geometry');
    }
    return geometry;
  }

  /** Spawn the clipper worker lazily; its chunk carries clipper, not the page. */
  function ensureWorker(): Worker {
    if (worker === undefined) {
      worker = new Worker(new URL('./svg.worker.ts', import.meta.url), {type: 'module'});
      worker.onmessage = onWorkerMessage;
    }
    return worker;
  }

  /** Network fetch of the default GLB, then loads it. */
  async function loadDefaultModel(): Promise<void> {
    showLoading();
    try {
      const response = await fetch(DEFAULT_MODEL_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch model (${response.status})`);
      }
      await loadModel(await response.arrayBuffer(), 'glb');
    } catch (error) {
      onLoadError(error);
    } finally {
      hideLoading();
    }
  }

  /** Reads a chosen File and loads it, replacing the current model. */
  async function loadFile(file: File): Promise<void> {
    showLoading();
    try {
      const format = formatFromName(file.name);
      if (format === undefined) {
        throw new Error('Unsupported file. Use a .glb, .obj, or .stl model.');
      }
      await loadModel(await file.arrayBuffer(), format);
    } catch (error) {
      onLoadError(error);
    } finally {
      hideLoading();
    }
  }

  /**
   * Loading a model resets the output: clear the old SVG and spin the preview
   * until the worker returns the first silhouette for the new model.
   */
  function showLoading(): void {
    loadingEl.dataset.hidden = 'false';
    currentSvg = '';
    previewEl.innerHTML = `<div class="${spinner}"></div>`;
    snippetFrameEl.dataset.loading = 'true';
    snippetSpinnerEl.hidden = false;
    // Fresh load: drop any prior error, and announce loading to screen readers
    // only (sighted users have the spinner) via the visually-hidden live region.
    dropErrorEl.textContent = '';
    liveEl.textContent = 'Loading model…';
  }

  function hideLoading(): void {
    loadingEl.dataset.hidden = 'true';
  }

  /**
   * On failure, show the reason inside the drop prompt (revealed for retry) and
   * announce it through the live region. The loading announcement is replaced, so
   * `hideLoading` leaves it intact.
   */
  function onLoadError(error: unknown): void {
    const message = messageFrom(error);
    dropErrorEl.textContent = message;
    liveEl.textContent = message;
    dropZoneEl.dataset.hidden = 'false';
  }

  /** Parses the model, builds the mesh, and mounts the viewport. */
  async function loadModel(buffer: ArrayBuffer, format: ModelFormat): Promise<void> {
    const [threeModule, geometryModule] = await Promise.all([import('three'), ensureGeometry()]);
    three = threeModule;
    ensureWorker();

    primitives = await parseModel(threeModule, buffer, format);
    rebuildMesh(geometryModule);

    mountViewport(threeModule, geometryModule.CAMPOS);
    rebuildDisplay(threeModule);
    dropZoneEl.dataset.hidden = 'true';
    // Clear the loading announcement now that the model is mounted.
    liveEl.textContent = '';
    // Every freshly loaded model starts at the default pose, then drifts.
    orientation = orientationFromMat3(threeModule, geometryModule.LOCKED_ORIENTATION);
    syncControls();
    applyPoseToViewport();
    requestEmit();
    restartIdle();
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

  function mountViewport(three: ThreeModule, campos: Vec3): void {
    if (viewport !== undefined) {
      return;
    }

    const renderer = new three.WebGLRenderer({canvas: canvasEl, antialias: true, alpha: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new three.Scene();
    const camera = new three.OrthographicCamera(-6, 6, 6, -6, 0.1, 100);
    // Share the silhouette's scan camera so the two panes always agree.
    camera.up.set(0, 0, 1);
    camera.position.set(campos[0], campos[1], campos[2]);
    camera.lookAt(0, 0, 0);

    // Front-upper-left key light for legible 3D shading (preview only).
    const key = new three.DirectionalLight(0xffffff, 2.2);
    key.position.set(6, -6, 8);
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
    const display = new three.Mesh(geometry, makeDisplayMaterial(three, colorInput.value));
    viewport.group.add(display);
    viewport.display = display;
    fitCamera(radius);
  }

  function fitCamera(radius: number): void {
    if (viewport === undefined) {
      return;
    }
    // ~1.2 keeps even the worst-case pose just inside the dashed scan frame.
    const half = radius * 1.2;
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

  /**
   * The viewport shows the model under the same orientation as the silhouette, so
   * the two panes always agree (the camera itself is fixed, set once at mount).
   */
  function applyPoseToViewport(): void {
    if (viewport === undefined || orientation === undefined) {
      return;
    }
    viewport.group.quaternion.copy(orientation);
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

  /** The currently checked Style radio. Defaults to shaded if somehow none is. */
  function currentMode(): EmitMode {
    const checked = modeGroup.querySelector<HTMLInputElement>('input:checked');
    return (checked?.value ?? 'shaded') as EmitMode;
  }

  /** Ask the worker for a fresh silhouette, coalescing while one is in flight. */
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
      mode: currentMode()
    };
    ctx.worker.postMessage(message);
  }

  /** Applies the worker reply and runs the freshest pending request. */
  function onWorkerMessage(event: MessageEvent<WorkerReply>): void {
    isWorkerBusy = false;
    const reply = event.data;
    if (reply.type === 'error') {
      // SVG generation failed with a model still loaded, so show the reason where
      // the icon would render (preview is aria-hidden. The live region carries it
      // to screen readers) and stop the snippet spinner.
      previewEl.textContent = reply.message;
      snippetFrameEl.dataset.loading = 'false';
      snippetSpinnerEl.hidden = true;
      liveEl.textContent = reply.message;
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

  /*
   * Idle showcase.
   */

  /**
   * Re-arm the idle showcase for a freshly loaded model (unless reduced motion),
   * cancelling any drift still running from a previous model.
   */
  function restartIdle(): void {
    if (idleRaf !== undefined) {
      cancelAnimationFrame(idleRaf);
      idleRaf = undefined;
    }
    isIdle = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    maybeStartIdle();
  }

  /** Start drifting through poses, but only if the user has not already taken over. */
  function maybeStartIdle(): void {
    if (!isIdle || three === undefined || orientation === undefined) {
      return;
    }
    idleTargets = buildIdleTargets(three, orientation);
    idleIndex = 0;
    idlePhase = 'dwell';
    idleDwellUntil = performance.now() + IDLE_DWELL_MS;
    idleLast = performance.now();
    idleRaf = requestAnimationFrame(idleTick);
  }

  /** Stops the showcase for good once the user interacts. */
  function stopIdle(): void {
    if (!isIdle) {
      return;
    }
    isIdle = false;
    if (idleRaf !== undefined) {
      cancelAnimationFrame(idleRaf);
      idleRaf = undefined;
    }
  }

  function idleTick(now: number): void {
    if (!isIdle) {
      return;
    }
    stepIdle(now);
    idleRaf = requestAnimationFrame(idleTick);
  }

  function stepIdle(now: number): void {
    if (three === undefined || orientation === undefined) {
      return;
    }
    if (idlePhase === 'dwell') {
      stepIdleDwell(now);
    } else {
      stepIdleMove(now, orientation);
    }
  }

  function stepIdleDwell(now: number): void {
    if (now >= idleDwellUntil) {
      idlePhase = 'move';
      idleLast = now;
    }
  }

  /** Ease the 3D model toward the target; paint the SVG only once it settles. */
  function stepIdleMove(now: number, current: THREE.Quaternion): void {
    const target = idleTargets[idleIndex];
    const dt = Math.min((now - idleLast) / 1000, 0.05);
    idleLast = now;
    current.rotateTowards(target, IDLE_SPEED_RAD * dt);
    syncControls();
    applyPoseToViewport();
    if (current.angleTo(target) < IDLE_ARRIVE_RAD) {
      requestEmit();
      idleIndex = (idleIndex + 1) % idleTargets.length;
      idlePhase = 'dwell';
      idleDwellUntil = now + IDLE_DWELL_MS;
    }
  }

  /** The emitted SVG fills with currentColor, so the host's color tints the preview. */
  function recolorPreview(): void {
    previewEl.style.color = colorInput.value;
    recolorModel();
  }

  /** Keep the 3D model's material in sync with the picked color. */
  function recolorModel(): void {
    if (viewport === undefined || viewport.display === undefined) {
      return;
    }
    (viewport.display.material as THREE.MeshStandardMaterial).color.set(colorInput.value);
    viewport.renderer.render(viewport.scene, viewport.camera);
  }

  function updateSnippets(): void {
    snippetInline.innerHTML = highlightSvg(currentSvg.trim());
    snippetFrameEl.dataset.loading = 'false';
    snippetSpinnerEl.hidden = true;
  }

  /*
   * Pose controls.
   */

  /** Apply an orientation, sync the sliders, redraw, and re-emit. */
  function applyOrientation(next: THREE.Quaternion): void {
    orientation = next;
    syncControls();
    applyPoseToViewport();
    requestEmit();
  }

  /** Reflect the orientation back onto the Euler sliders and number fields. */
  function syncControls(): void {
    if (orientation === undefined || three === undefined) {
      return;
    }
    const euler = new three.Euler().setFromQuaternion(orientation, 'XYZ');
    const xValue = String(wrapAngle(radToDeg(euler.x)));
    const yValue = String(wrapAngle(radToDeg(euler.y)));
    const zValue = String(wrapAngle(radToDeg(euler.z)));
    xRange.value = xValue;
    yRange.value = yValue;
    zRange.value = zValue;
    setNumberValue(xNumber, xValue);
    setNumberValue(yNumber, yValue);
    setNumberValue(zNumber, zValue);
  }

  /** Don't overwrite a number field while the user is typing/stepping in it. */
  function setNumberValue(input: HTMLInputElement, value: string): void {
    if (document.activeElement !== input) {
      input.value = value;
    }
  }

  function onSliderInput(): void {
    if (three === undefined) {
      return;
    }
    const euler = new three.Euler(
      degToRad(maybeSnap(Number(xRange.value))),
      degToRad(maybeSnap(Number(yRange.value))),
      degToRad(maybeSnap(Number(zRange.value))),
      'XYZ'
    );
    applyOrientation(new three.Quaternion().setFromEuler(euler));
  }

  /** A number field drives the same pose; mirror it into its slider, then apply. */
  function onNumberInput(slider: HTMLInputElement, numberInput: HTMLInputElement): void {
    if (numberInput.value === '') {
      return;
    }
    slider.value = numberInput.value;
    onSliderInput();
  }

  function maybeSnap(degrees: number): number {
    return snapToggle.checked ? Math.round(degrees / SNAP_STEP) * SNAP_STEP : degrees;
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

  /** Project a pointer onto a virtual unit sphere over the viewport. */
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

  /** Rotate the model so the grabbed point tracks the cursor (Shoemake arcball). */
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

  xRange.addEventListener('input', onSliderInput);
  yRange.addEventListener('input', onSliderInput);
  zRange.addEventListener('input', onSliderInput);
  for (const [slider, numberInput] of [
    [xRange, xNumber],
    [yRange, yNumber],
    [zRange, zNumber]
  ] as const) {
    const apply = (): void => onNumberInput(slider, numberInput);
    numberInput.addEventListener('input', apply);
    numberInput.addEventListener('change', apply);
  }

  snapToggle.addEventListener('change', onSliderInput);
  // Reset returns to the model's default pose (the angle it loads at), not flat-zero.
  resetButton.addEventListener('click', () => {
    if (geometry !== undefined && three !== undefined) {
      applyOrientation(orientationFromMat3(three, geometry.LOCKED_ORIENTATION));
    }
  });

  colorInput.addEventListener('input', recolorPreview);
  modeGroup.addEventListener('change', requestEmit);
  downloadButton.addEventListener('click', downloadSvg);

  copyInlineButton.addEventListener('click', () =>
    copyText(snippetInline.textContent ?? '', copyInlineButton)
  );

  // Any interaction anywhere in the tool retires the idle showcase.
  const studioRoot = viewportEl.closest('[data-studio-root]');
  studioRoot?.addEventListener('pointerdown', stopIdle);
  studioRoot?.addEventListener('input', stopIdle);
  studioRoot?.addEventListener('change', stopIdle);

  viewportEl.addEventListener('pointerdown', onPointerDown);
  viewportEl.addEventListener('pointermove', onPointerMove);
  viewportEl.addEventListener('pointerup', onPointerUp);
  viewportEl.addEventListener('pointercancel', onPointerUp);

  dropZoneEl.addEventListener('click', () => fileInputEl.click());
  loadButtonEl.addEventListener('click', () => fileInputEl.click());
  fileInputEl.addEventListener('change', () => {
    const file = fileInputEl.files?.[0];
    if (file !== undefined) {
      void loadFile(file);
    }
    // Clear so re-picking the same file still fires `change`.
    fileInputEl.value = '';
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

  /** Triggers a browser download of the current SVG. */
  function downloadSvg(): void {
    if (currentSvg.length === 0) {
      return;
    }
    const blob = new Blob([currentSvg], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'icon.svg';
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

/*
 * Helpers.
 */

function formatFromName(name: string): ModelFormat | undefined {
  const lower = name.toLowerCase();
  if (lower.endsWith('.glb')) {
    return 'glb';
  }
  if (lower.endsWith('.obj')) {
    return 'obj';
  }
  if (lower.endsWith('.stl')) {
    return 'stl';
  }
  return undefined;
}

/**
 * Parse a model buffer with the loader for its format, returning raw primitives.
 * Each loader is imported on demand so its code only ships when that format is used.
 */
async function parseModel(
  three: ThreeModule,
  buffer: ArrayBuffer,
  format: ModelFormat
): Promise<RawPrimitive[]> {
  if (format === 'obj') {
    const {OBJLoader} = await import('three/examples/jsm/loaders/OBJLoader.js');
    return extractPrimitives(new OBJLoader().parse(new TextDecoder().decode(buffer)));
  }
  if (format === 'stl') {
    const {STLLoader} = await import('three/examples/jsm/loaders/STLLoader.js');
    return extractPrimitives(new three.Mesh(new STLLoader().parse(buffer)));
  }
  const {GLTFLoader} = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  return extractPrimitives(gltf.scene);
}

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

/** Read x/y/z per vertex so interleaved/normalized attributes deinterleave correctly. */
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
  let maxDistanceSq = 0;
  for (let index = 0; index < mesh.vertices.length; index++) {
    const [x, y, z] = mesh.vertices[index];
    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;
    maxDistanceSq = Math.max(maxDistanceSq, x * x + y * y + z * z);
  }
  geometry.setAttribute('position', new three.BufferAttribute(positions, 3));
  geometry.setIndex(mesh.faces.flat());
  geometry.computeVertexNormals();
  // Radius about the origin (the rotation/look-at center) so no pose can clip.
  return {geometry, radius: Math.sqrt(maxDistanceSq) || 6};
}

function makeDisplayMaterial(three: ThreeModule, color: string): THREE.MeshStandardMaterial {
  return new three.MeshStandardMaterial({
    color,
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

/**
 * A loop of showcase orientations: orbit the base pose around vertical with a
 * gentle pitch wobble so each stop shows a distinct silhouette.
 */
function buildIdleTargets(three: ThreeModule, base: THREE.Quaternion): THREE.Quaternion[] {
  const up = new three.Vector3(0, 0, 1);
  const side = new three.Vector3(1, 0, 0);
  const targets: THREE.Quaternion[] = [];
  for (let step = 1; step <= IDLE_STEPS; step++) {
    const yaw = new three.Quaternion().setFromAxisAngle(up, (step / IDLE_STEPS) * Math.PI * 2);
    const pitch = new three.Quaternion().setFromAxisAngle(side, Math.sin(step * 1.7) * 0.5);
    targets.push(yaw.multiply(pitch).multiply(base.clone()));
  }
  return targets;
}

/** Writes to the clipboard and flashes the button's copied state. */
async function copyText(text: string, button: HTMLButtonElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    button.dataset.copied = 'true';
    window.setTimeout(() => {
      delete button.dataset.copied;
    }, 1200);
  } catch {
    // Leave the button as-is if the clipboard is unavailable.
  }
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/**
 * Lightweight highlighter for our own predictable SVG output: tags, attribute
 * names, and quoted values. `textContent` of the result is still the raw SVG.
 */
function highlightSvg(svg: string): string {
  return svg
    .split(/(<[^>]*>)/)
    .map(part => (part.startsWith('<') ? highlightTag(part) : escapeHtml(part)))
    .join('');
}

function highlightTag(tag: string): string {
  return tag.replace(
    /(<\/?)([A-Za-z][\w-]*)|([A-Za-z][\w-]*)(=)("[^"]*")|(\/?>)/g,
    (match, open, name, attr, equals, value, close) => {
      if (name !== undefined) {
        return escapeHtml(open) + span(codeTag, name);
      }
      if (attr !== undefined) {
        return span(codeAttr, attr) + escapeHtml(equals) + span(codeString, value);
      }
      if (close !== undefined) {
        return escapeHtml(close);
      }
      return escapeHtml(match);
    }
  );
}

function span(className: string, text: string): string {
  return `<span class="${className}">${escapeHtml(text)}</span>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
