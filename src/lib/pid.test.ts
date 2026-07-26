import {describe, expect, it} from 'vitest';

import {createPID, stepPID} from './pid';

/*
 * Tests.
 */

describe('stepPID', () => {
  it('scales output by kp against the current error', () => {
    const pid = createPID({kp: 2, ki: 0, kd: 0});
    expect(stepPID(pid, 1.5, 1 / 60)).toBeCloseTo(3);
  });

  it('accumulates the integral term across steps', () => {
    const pid = createPID({kp: 0, ki: 1, kd: 0});
    stepPID(pid, 1, 0.1);
    stepPID(pid, 1, 0.1);
    expect(stepPID(pid, 1, 0.1)).toBeCloseTo(0.3);
  });

  it('caps the integral at maxIntegral', () => {
    const pid = createPID({kp: 0, ki: 1, kd: 0, maxIntegral: 0.25});
    stepPID(pid, 1, 1);
    expect(stepPID(pid, 1, 1)).toBeCloseTo(0.25);
  });

  it('skips the differenced derivative until a previous error exists', () => {
    const pid = createPID({kp: 0, ki: 0, kd: 10});
    expect(stepPID(pid, 5, 1 / 60)).toBe(0);
  });

  it('differences successive errors for the derivative term', () => {
    const pid = createPID({kp: 0, ki: 0, kd: 1});
    stepPID(pid, 2, 1);
    expect(stepPID(pid, 4, 1)).toBeCloseTo(2);
  });

  it('prefers a caller-supplied error derivative over differencing', () => {
    const pid = createPID({kp: 0, ki: 0, kd: 1});
    stepPID(pid, 0, 1);
    // The differenced slope would be (10 - 0) / 1 = 10; the measured signal wins.
    expect(stepPID(pid, 10, 1, -3)).toBeCloseTo(-3);
  });

  it('returns zero without mutating state when dt is not positive', () => {
    const pid = createPID({kp: 1, ki: 1, kd: 1});
    expect(stepPID(pid, 5, 0)).toBe(0);
    expect(pid.integral).toBe(0);
    expect(pid.hasPreviousError).toBe(false);
  });
});
