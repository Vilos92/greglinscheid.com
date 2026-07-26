import type {PID} from '../lib/pid';
import {createPID, stepPID} from '../lib/pid';

/*
 * Types.
 */

type AxisMotion = {
  pid: PID;
  /** Smoothed normalized position, kept within [-1, 1]. */
  value: number;
  velocity: number;
};

type BlinkPhase = 'waiting' | 'closing' | 'shut' | 'opening';

type Blink = {
  phase: BlinkPhase;
  msLeft: number;
  /** How slow the previous inter-blink delay was, from 0 (quickest) to 1 (slowest). */
  normalizedDelay: number;
};

type BlinkDelayRoll = {
  delayMs: number;
  normalizedDelay: number;
};

/*
 * Constants.
 */

/*
 * The face chases the cursor by feeding a normalized cursor signal through a PID controller
 * and applying the output as an acceleration — that is where the motion's inertia comes from.
 * The derivative term acts on the measured velocity (derivative-on-measurement), so a cursor
 * leaping across the page cannot spike the acceleration. The gains fit a spring-damper at
 * ~1.2 Hz with a damping ratio of ~1.1: overdamped, settling with no overshoot. `ki` stays 0
 * until there is a steady disturbance to reject.
 */
const CHASE_GAINS = {kp: 60, ki: 0, kd: 17};

// Head radius (64) plus an 8px resting margin inside the 100px half-extent.
const HEAD_MAX_TRAVEL = 28;

/*
 * How much further than the head the features slide at full deflection. The eyes ride high and
 * the smile hangs low, so there is more spare face below the features than above.
 */
const FEATURE_TRAVEL = {left: 12, right: 12, up: 10, down: 18};

// Clamp the frame delta so the physics stay stable across tab switches and long frames.
const MAX_FRAME_DELTA_SECONDS = 1 / 30;

/*
 * Blinking: a vertical squash of each eye about its own center. Lids close fast, hold briefly
 * so the squint reads, and reopen slower. The cadence has memory — a quick blink biases the
 * next delay toward slow and vice versa — via `random() ** skew`, where skew < 1 favors slow
 * draws and skew > 1 favors quick ones.
 */
const EYE_SHUT_SCALE = 0.3;
const BLINK_CLOSE_MS = 70;
const BLINK_HOLD_MS = 60;
const BLINK_OPEN_MS = 130;
const BLINK_DELAY_MIN_MS = 900;
const BLINK_DELAY_MAX_MS = 4200;
const BLINK_SKEW_AFTER_QUICK = 0.45;
const BLINK_SKEW_AFTER_SLOW = 1.6;

const BLINK_PHASE_AFTER: Record<BlinkPhase, BlinkPhase> = {
  waiting: 'closing',
  closing: 'shut',
  shut: 'opening',
  opening: 'waiting'
};

// The `waiting` duration is rolled per blink, so it has no fixed entry here.
const BLINK_PHASE_DURATION_MS: Record<Exclude<BlinkPhase, 'waiting'>, number> = {
  closing: BLINK_CLOSE_MS,
  shut: BLINK_HOLD_MS,
  opening: BLINK_OPEN_MS
};

/*
 * Script.
 */

/** Brings every not-yet-started Milo on the page to life. Safe to call more than once. */
export function startMilos(): void {
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
  const head = svg.querySelector<SVGGElement>('[data-milo-head]');
  const features = svg.querySelector<SVGGElement>('[data-milo-features]');
  const eyes = [...svg.querySelectorAll<SVGCircleElement>('[data-milo-eye]')];
  if (!head || !features || eyes.length === 0) {
    throw new Error('Milo markup is missing its head, features, or eyes.');
  }

  const tracker = trackCursor(svg);
  const axisX: AxisMotion = {pid: createPID(CHASE_GAINS), value: 0, velocity: 0};
  const axisY: AxisMotion = {pid: createPID(CHASE_GAINS), value: 0, velocity: 0};
  const blink = createBlink();

  let previousTime: number | undefined;
  const onFrame = (time: number) => {
    // The face may be swapped out from under us (e.g. a Storybook re-render); let go fully.
    if (!svg.isConnected) {
      tracker.dispose();
      return;
    }

    const deltaSeconds =
      previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, MAX_FRAME_DELTA_SECONDS);
    previousTime = time;

    stepAxis(axisX, tracker.target.x, deltaSeconds);
    stepAxis(axisY, tracker.target.y, deltaSeconds);

    const headX = axisX.value * HEAD_MAX_TRAVEL;
    const headY = axisY.value * HEAD_MAX_TRAVEL;
    head.setAttribute('transform', `translate(${headX} ${headY})`);
    features.setAttribute(
      'transform',
      `translate(${headX + scaleTravel(axisX.value, FEATURE_TRAVEL.left, FEATURE_TRAVEL.right)} ${
        headY + scaleTravel(axisY.value, FEATURE_TRAVEL.up, FEATURE_TRAVEL.down)
      })`
    );

    const eyeScale = stepBlink(blink, deltaSeconds * 1000);
    for (const eye of eyes) {
      eye.setAttribute('transform', `scale(1 ${eyeScale})`);
    }

    requestAnimationFrame(onFrame);
  };

  requestAnimationFrame(onFrame);
}

/**
 * Follows the page-wide cursor position as a normalized offset from the svg's center, each
 * axis saturating at ±1 once the cursor passes the svg's edge. The center is cached so pointer
 * events never force layout, and forgotten whenever the svg may have moved.
 */
function trackCursor(svg: SVGSVGElement) {
  const target = {x: 0, y: 0};
  let bounds: {centerX: number; centerY: number; halfSize: number} | undefined;

  const forgetBounds = () => {
    bounds = undefined;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!bounds) {
      const rect = svg.getBoundingClientRect();
      bounds = {
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        halfSize: rect.width / 2
      };
    }

    target.x = clampUnit((event.clientX - bounds.centerX) / bounds.halfSize);
    target.y = clampUnit((event.clientY - bounds.centerY) / bounds.halfSize);
  };

  const resizeObserver = new ResizeObserver(forgetBounds);
  resizeObserver.observe(svg);
  window.addEventListener('resize', forgetBounds, {passive: true});
  window.addEventListener('scroll', forgetBounds, {passive: true, capture: true});
  window.addEventListener('pointermove', onPointerMove, {passive: true});

  return {
    target,
    dispose() {
      resizeObserver.disconnect();
      window.removeEventListener('resize', forgetBounds);
      window.removeEventListener('scroll', forgetBounds, {capture: true});
      window.removeEventListener('pointermove', onPointerMove);
    }
  };
}

/**
 * Advances one axis of the face physics, treating the controller output as an acceleration.
 * The normalized extremes at ±1 are hard walls — the position clamps there and any outward
 * velocity dies against them.
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
}

/** Scales a normalized offset by a direction-dependent travel distance. */
function scaleTravel(normalized: number, negativeTravel: number, positiveTravel: number): number {
  return normalized * (normalized < 0 ? negativeTravel : positiveTravel);
}

function createBlink(): Blink {
  // A neutral history keeps the very first delay unbiased.
  const roll = rollBlinkDelay(0.5);
  return {phase: 'waiting', msLeft: roll.delayMs, normalizedDelay: roll.normalizedDelay};
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

  blink.msLeft = BLINK_PHASE_DURATION_MS[phase];
}

/** Computes the eyes' vertical scale for the current blink phase. */
function computeEyeScale(blink: Blink): number {
  if (blink.phase === 'waiting') {
    return 1;
  }

  if (blink.phase === 'shut') {
    return blendEyeScale(1);
  }

  const closedAmount =
    blink.phase === 'closing' ? 1 - blink.msLeft / BLINK_CLOSE_MS : blink.msLeft / BLINK_OPEN_MS;
  return blendEyeScale(smoothstep(closedAmount));
}

/** Maps a closed amount in [0, 1] onto the eye's vertical scale. */
function blendEyeScale(closedAmount: number): number {
  return 1 - closedAmount * (1 - EYE_SHUT_SCALE);
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
