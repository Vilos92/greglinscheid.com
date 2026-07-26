import type {PID} from '../../lib/pid';
import {createPID, stepPID} from '../../lib/pid';

/*
 * Types.
 */

type AxisMotion = {
  pid: PID;
  /** Smoothed normalized position, kept within [-1, 1]. */
  value: number;
  velocity: number;
};

type BlinkActivePhase = 'closing' | 'shut' | 'opening';

type BlinkPhase = 'waiting' | BlinkActivePhase;

type BlinkProfile = {
  durationsMs: Record<BlinkActivePhase, number>;
  /** How far the lids squash the eye at full close, as a vertical scale. */
  shutScale: number;
};

type Blink = {
  phase: BlinkPhase;
  msLeft: number;
  profile: BlinkProfile;
  /** How slow the previous inter-blink delay was, from 0 (quickest) to 1 (slowest). */
  normalizedDelay: number;
};

type BlinkDelayRoll = {
  delayMs: number;
  normalizedDelay: number;
};

type MiloParts = {
  head: SVGGElement;
  face: SVGGElement;
  ears: SVGGElement;
  features: SVGGElement;
  eyes: SVGGElement[];
  pupils: SVGGElement[];
};

/*
 * Constants.
 */

/*
 * The face chases the cursor by feeding a normalized cursor signal through a PID
 * controller and applying the output as an acceleration, which is where the motion's
 * inertia comes from. The derivative term acts on the measured velocity (derivative-on-
 * measurement), so a cursor leaping across the page cannot spike the acceleration. The
 * gains fit a spring-damper at ~1.2 Hz with a damping ratio of ~1.1: overdamped, settling
 * with no overshoot. `ki` stays 0 until there is a steady disturbance to reject.
 */
const CHASE_GAINS = {kp: 60, ki: 0, kd: 17};

// The head's ear tips and whisker ends leave this much travel inside the 110-unit half-extent.
const HEAD_MAX_TRAVEL = 16;

/*
 * How much further than the head the features slide at full deflection. The eyes ride high
 * and the mouth hangs low, so there is more spare face below the features than above.
 */
const FEATURE_TRAVEL = {left: 8, right: 8, up: 6, down: 10};

// The pupils slide a touch further than the eyes, so Milo looks at the cursor, not just toward it.
const PUPIL_TRAVEL = 3;

/*
 * How much of the features' travel the painted face plane (fur pattern, blaze)
 * follows. The standard 2.5D head-turn rig orders depth as skull < face markings
 * < features < pupils: the markings must ride with the features (clipped by the
 * skull silhouette) or they read as a static decal the features float over.
 * Keeping them slightly behind the features adds the curvature cue real rigs use.
 */
const FACE_TRAVEL_RATIO = 0.75;

// The ear interiors shift only gently inside the static silhouette ear cones,
// so they read as the ears foreshortening without ever escaping the cone frame.
const EAR_TRAVEL_RATIO = 0.25;

// Clamp the frame delta so the physics stay stable across tab switches and long frames.
const MAX_FRAME_DELTA_SECONDS = 1 / 30;

/*
 * The controller is overdamped (no overshoot), but its exponential tail creeps sub-
 * pixel for seconds, and high-contrast edges shimmer while they crawl. Once the error
 * and velocity both fall below these thresholds the axis snaps exactly onto the
 * target and freezes. Simulation showed the snap lands with zero overshoot at every
 * frame rate. Position is in normalized units, where 0.002 stays sub-pixel at the
 * eyes for any reasonable render size. Velocity is in normalized units per second.
 */
const REST_POSITION_EPSILON = 0.002;
const REST_VELOCITY_EPSILON = 0.02;

/*
 * Blinking: a vertical squash of each eye about its own center. Lids close fast,
 * hold briefly so the squint reads, and reopen slower. The cadence has memory: a
 * quick blink biases the next delay toward slow and vice versa, via `random() **
 * skew`, where skew < 1 favors slow draws and skew > 1 favors quick ones.
 */
const BLINK_DELAY_MIN_MS = 900;
const BLINK_DELAY_MAX_MS = 4200;
const BLINK_SKEW_AFTER_QUICK = 0.45;
const BLINK_SKEW_AFTER_SLOW = 1.6;

const QUICK_BLINK: BlinkProfile = {durationsMs: {closing: 70, shut: 60, opening: 130}, shutScale: 0.15};

// The occasional languid half-close that contented cats do, instead of a quick blink.
const SLOW_BLINK: BlinkProfile = {durationsMs: {closing: 300, shut: 320, opening: 480}, shutScale: 0.3};
const SLOW_BLINK_CHANCE = 0.15;

const BLINK_PHASE_AFTER: Record<BlinkPhase, BlinkPhase> = {
  waiting: 'closing',
  closing: 'shut',
  shut: 'opening',
  opening: 'waiting'
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/*
 * State.
 */

// Lazily created on the first startMilos call so importing this module has no side effects.
let motionPreference: MediaQueryList | undefined;

/*
 * Entry.
 */

/**
 * Brings every not-yet-started Milo on the page to life. Safe to call more than once.
 * Under `prefers-reduced-motion` Milo stays a static portrait: nothing starts while
 * the preference is on, running loops shut themselves down when it flips on, and a
 * flip back off sweeps the page again.
 */
export function startMilos(): void {
  if (!motionPreference) {
    motionPreference = window.matchMedia(REDUCED_MOTION_QUERY);
    motionPreference.addEventListener('change', () => startMilos());
  }

  if (motionPreference.matches) {
    return;
  }

  for (const svg of document.querySelectorAll<SVGSVGElement>('svg[data-milo]')) {
    if (svg.dataset.miloStarted !== 'true') {
      svg.dataset.miloStarted = 'true';
      startMilo(svg);
    }
  }
}

/*
 * Helpers.
 */

function startMilo(svg: SVGSVGElement): void {
  const parts: MiloParts = {
    head: requireElement(svg.querySelector<SVGGElement>('[data-milo-head]'), 'head'),
    face: requireElement(svg.querySelector<SVGGElement>('[data-milo-face]'), 'face'),
    ears: requireElement(svg.querySelector<SVGGElement>('[data-milo-ears]'), 'ears'),
    features: requireElement(svg.querySelector<SVGGElement>('[data-milo-features]'), 'features'),
    eyes: [...svg.querySelectorAll<SVGGElement>('[data-milo-eye]')],
    pupils: [...svg.querySelectorAll<SVGGElement>('[data-milo-pupil]')]
  };
  requireElement(parts.eyes[0], 'eyes');
  requireElement(parts.pupils[0], 'pupils');

  const tracker = trackCursor(svg);
  const axisX: AxisMotion = {pid: createPID(CHASE_GAINS), value: 0, velocity: 0};
  const axisY: AxisMotion = {pid: createPID(CHASE_GAINS), value: 0, velocity: 0};
  const blink = createBlink();

  let previousTime: number | undefined;

  /*
   * The last pose written to the DOM. Re-writing identical attribute values still
   * dirties the SVG subtree and costs style/paint work every frame, so a Milo at
   * rest between blinks (values frozen by the rest snap, eyes fully open) skips
   * the DOM entirely. NaN never equals itself, so the first frame always writes.
   */
  const writtenPose = {x: NaN, y: NaN, eyeScale: NaN};

  const onFrame = (time: number) => {
    // The face may be swapped out from under us (e.g. a Storybook re-render), so let go fully.
    // Clearing the started flag lets a reattached svg come back to life on the next sweep.
    if (!svg.isConnected) {
      delete svg.dataset.miloStarted;
      tracker.dispose();
      return;
    }

    // Reduced motion flipped on mid-flight: settle into the neutral portrait and let go.
    if (motionPreference?.matches) {
      axisX.value = 0;
      axisX.velocity = 0;
      axisY.value = 0;
      axisY.velocity = 0;
      applyPose(parts, axisX, axisY, 1);
      delete svg.dataset.miloStarted;
      tracker.dispose();
      return;
    }

    const deltaSeconds =
      previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, MAX_FRAME_DELTA_SECONDS);
    previousTime = time;

    stepAxis(axisX, tracker.target.x, deltaSeconds);
    stepAxis(axisY, tracker.target.y, deltaSeconds);
    const eyeScale = stepBlink(blink, deltaSeconds * 1000);

    if (axisX.value !== writtenPose.x || axisY.value !== writtenPose.y || eyeScale !== writtenPose.eyeScale) {
      applyPose(parts, axisX, axisY, eyeScale);
      writtenPose.x = axisX.value;
      writtenPose.y = axisY.value;
      writtenPose.eyeScale = eyeScale;
    }

    requestAnimationFrame(onFrame);
  };

  requestAnimationFrame(onFrame);
}

/** Fails fast when a marker element is missing from the Milo markup. */
function requireElement<T extends Element>(element: T | null | undefined, marker: string): T {
  if (!element) {
    throw new Error(`Milo markup is missing its ${marker}.`);
  }

  return element;
}

/** Writes this frame's parallax transforms and blink scale onto the face's layer groups. */
function applyPose(parts: MiloParts, axisX: AxisMotion, axisY: AxisMotion, eyeScale: number): void {
  const headX = axisX.value * HEAD_MAX_TRAVEL;
  const headY = axisY.value * HEAD_MAX_TRAVEL;
  const shiftX = scaleTravel(axisX.value, FEATURE_TRAVEL.left, FEATURE_TRAVEL.right);
  const shiftY = scaleTravel(axisY.value, FEATURE_TRAVEL.up, FEATURE_TRAVEL.down);

  parts.head.setAttribute('transform', `translate(${headX} ${headY})`);
  // The face plane lives inside the head group, so its shift is relative to the skull.
  parts.face.setAttribute(
    'transform',
    `translate(${shiftX * FACE_TRAVEL_RATIO} ${shiftY * FACE_TRAVEL_RATIO})`
  );
  parts.ears.setAttribute(
    'transform',
    `translate(${shiftX * EAR_TRAVEL_RATIO} ${shiftY * EAR_TRAVEL_RATIO})`
  );
  parts.features.setAttribute('transform', `translate(${headX + shiftX} ${headY + shiftY})`);

  for (const pupil of parts.pupils) {
    pupil.setAttribute('transform', `translate(${axisX.value * PUPIL_TRAVEL} ${axisY.value * PUPIL_TRAVEL})`);
  }

  for (const eye of parts.eyes) {
    eye.setAttribute('transform', `scale(1 ${eyeScale})`);
  }
}

/**
 * Follows the page-wide cursor or finger position as a normalized offset from the
 * svg's center, each axis saturating at ±1 once it passes the svg's edge. Registers
 * window-level listeners that live until `dispose` is called. The center is cached
 * so input events never force layout, and forgotten whenever the svg may have moved.
 */
function trackCursor(svg: SVGSVGElement) {
  const target = {x: 0, y: 0};
  let bounds: {centerX: number; centerY: number; halfSize: number} | undefined;

  const forgetBounds = () => {
    bounds = undefined;
  };

  const updateTarget = (clientX: number, clientY: number) => {
    if (!bounds) {
      const rect = svg.getBoundingClientRect();
      // A hidden or collapsed svg has no usable geometry, and dividing by
      // it would poison the target with NaN, so wait for a real layout.
      if (rect.width === 0) {
        return;
      }

      bounds = {
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        halfSize: rect.width / 2
      };
    }

    target.x = clampUnit((clientX - bounds.centerX) / bounds.halfSize);
    target.y = clampUnit((clientY - bounds.centerY) / bounds.halfSize);
  };

  // `isPrimary` keeps a second finger from wrestling the gaze away mid-drag.
  const onPointerMove = (event: PointerEvent) => {
    if (event.isPrimary) {
      updateTarget(event.clientX, event.clientY);
    }
  };

  /*
   * Taps (and clicks) redirect the gaze even when they never move. Fingers are
   * followed only for as long as the pointer stream lives: the browser fires
   * pointercancel once a drag turns into a scroll, and Milo simply holds his
   * last glance. (Touch events do keep firing through a scroll, but browsers
   * disagree enough about when that following a scrolling finger reads as
   * broken more often than charming. A non-scrolling host like the /milo stage
   * opts out via `touch-action: none`, which keeps the pointer stream alive
   * for the whole drag.)
   */
  const onPointerDown = onPointerMove;

  const resizeObserver = new ResizeObserver(forgetBounds);
  resizeObserver.observe(svg);
  window.addEventListener('resize', forgetBounds, {passive: true});
  window.addEventListener('scroll', forgetBounds, {passive: true, capture: true});
  window.addEventListener('pointermove', onPointerMove, {passive: true});
  window.addEventListener('pointerdown', onPointerDown, {passive: true});

  return {
    target,
    dispose() {
      resizeObserver.disconnect();
      window.removeEventListener('resize', forgetBounds);
      window.removeEventListener('scroll', forgetBounds, {capture: true});
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
    }
  };
}

/**
 * Advances one axis of the face physics, treating the controller output
 * as an acceleration. The normalized extremes at ±1 are hard walls. The
 * position clamps there and any outward velocity dies against them.
 * @sideEffect Mutates `axis`.
 */
function stepAxis(axis: AxisMotion, target: number, deltaSeconds: number): void {
  const acceleration = stepPID(axis.pid, target - axis.value, deltaSeconds, -axis.velocity);
  axis.velocity += acceleration * deltaSeconds;
  axis.value += axis.velocity * deltaSeconds;

  if (axis.value > 1) {
    axis.value = 1;
    axis.velocity = Math.min(axis.velocity, 0);
  }

  if (axis.value < -1) {
    axis.value = -1;
    axis.velocity = Math.max(axis.velocity, 0);
  }

  snapAxisAtRest(axis, target);
}

/**
 * Freezes an axis exactly on its target once the motion is imperceptible,
 * ending the sub-pixel settle tail (see the rest epsilon constants).
 * @sideEffect Mutates `axis`.
 */
function snapAxisAtRest(axis: AxisMotion, target: number): void {
  if (
    Math.abs(target - axis.value) < REST_POSITION_EPSILON &&
    Math.abs(axis.velocity) < REST_VELOCITY_EPSILON
  ) {
    axis.value = target;
    axis.velocity = 0;
  }
}

/** Scales a normalized offset by a direction-dependent travel distance. */
function scaleTravel(normalized: number, negativeTravel: number, positiveTravel: number): number {
  return normalized * (normalized < 0 ? negativeTravel : positiveTravel);
}

function createBlink(): Blink {
  // A neutral history keeps the very first delay unbiased.
  const roll = rollBlinkDelay(0.5);
  return {
    phase: 'waiting',
    msLeft: roll.delayMs,
    profile: QUICK_BLINK,
    normalizedDelay: roll.normalizedDelay
  };
}

/** Rolls the next inter-blink delay, biased away from the pace of the previous one. */
function rollBlinkDelay(previousNormalizedDelay: number): BlinkDelayRoll {
  const skew =
    BLINK_SKEW_AFTER_QUICK + (BLINK_SKEW_AFTER_SLOW - BLINK_SKEW_AFTER_QUICK) * previousNormalizedDelay;
  const normalizedDelay = Math.random() ** skew;
  return {
    delayMs: BLINK_DELAY_MIN_MS + normalizedDelay * (BLINK_DELAY_MAX_MS - BLINK_DELAY_MIN_MS),
    normalizedDelay
  };
}

/**
 * Advances the blink cycle and returns the eyes' vertical scale for this frame:
 * waiting (open) → closing → shut hold → opening → waiting, then a fresh random delay.
 * @sideEffect Mutates `blink`.
 */
function stepBlink(blink: Blink, deltaMs: number): number {
  blink.msLeft -= deltaMs;
  if (blink.msLeft <= 0) {
    advanceBlinkPhase(blink);
  }

  return computeEyeScale(blink);
}

/** @sideEffect Mutates `blink`. */
function advanceBlinkPhase(blink: Blink): void {
  const phase = BLINK_PHASE_AFTER[blink.phase];
  blink.phase = phase;

  if (phase === 'waiting') {
    const roll = rollBlinkDelay(blink.normalizedDelay);
    blink.msLeft = roll.delayMs;
    blink.normalizedDelay = roll.normalizedDelay;
    return;
  }

  // A blink commits to one profile as the lids start to close.
  if (phase === 'closing') {
    blink.profile = Math.random() < SLOW_BLINK_CHANCE ? SLOW_BLINK : QUICK_BLINK;
  }

  blink.msLeft = blink.profile.durationsMs[phase];
}

/** Computes the eyes' vertical scale for the current blink phase. */
function computeEyeScale(blink: Blink): number {
  if (blink.phase === 'waiting') {
    return 1;
  }

  if (blink.phase === 'shut') {
    return blendEyeScale(1, blink.profile);
  }

  const {durationsMs} = blink.profile;
  const closedAmount =
    blink.phase === 'closing' ? 1 - blink.msLeft / durationsMs.closing : blink.msLeft / durationsMs.opening;
  return blendEyeScale(smoothstep(closedAmount), blink.profile);
}

/** Maps a closed amount in [0, 1] onto the eye's vertical scale. */
function blendEyeScale(closedAmount: number, profile: BlinkProfile): number {
  return 1 - closedAmount * (1 - profile.shutScale);
}

/** Smoothstep easing for a natural accelerate/decelerate feel on lid motion. */
function smoothstep(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * (3 - 2 * t);
}

/** Clamps a normalized offset to [-1, 1]. */
function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}
