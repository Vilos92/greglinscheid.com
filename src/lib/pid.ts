/*
 * Types.
 */

export type PIDOptions = {
  /** Proportional gain: output per unit of current error. */
  kp: number;
  /** Integral gain: output per unit of accumulated error, for erasing steady-state offset. */
  ki: number;
  /** Derivative gain: output per unit of error slope, for damping the approach. */
  kd: number;
  /** Cap on the accumulated integral term (anti-windup). Omit for unbounded. */
  maxIntegral?: number;
};

/**
 * PID controller state. Output units are the caller's to interpret
 * (velocity, acceleration, …). Gains are fixed at creation. The
 * `integral` and `previousError` fields mutate in place each step.
 */
export type PID = {
  readonly kp: number;
  readonly ki: number;
  readonly kd: number;
  readonly maxIntegral: number | undefined;
  integral: number;
  previousError: number;
  hasPreviousError: boolean;
};

/*
 * Helpers.
 */

export function createPID(options: PIDOptions): PID {
  if (options.maxIntegral !== undefined && !(options.maxIntegral >= 0)) {
    throw new Error('PID maxIntegral must be a non-negative number.');
  }

  return {
    kp: options.kp,
    ki: options.ki,
    kd: options.kd,
    maxIntegral: options.maxIntegral,
    integral: 0,
    previousError: 0,
    hasPreviousError: false
  };
}

/**
 * Advance the controller one step and return the control
 * output. Returns `0` without mutating state when `dt <= 0`.
 *
 * `errorDerivative`, when given, replaces the internally differenced error slope.
 * Feeding a measured signal (e.g. the negated velocity of the controlled value) gives
 * derivative-on- measurement, which keeps a jumping setpoint from spiking the output.
 * @sideEffect Mutates `pid`.
 */
export function stepPID(pid: PID, error: number, dt: number, errorDerivative?: number): number {
  if (dt <= 0) {
    return 0;
  }

  pid.integral += error * dt;
  if (pid.maxIntegral !== undefined) {
    pid.integral = Math.max(-pid.maxIntegral, Math.min(pid.maxIntegral, pid.integral));
  }

  const fallbackDerivative = pid.hasPreviousError ? (error - pid.previousError) / dt : 0;
  const derivative = errorDerivative ?? fallbackDerivative;
  pid.previousError = error;
  pid.hasPreviousError = true;

  return pid.kp * error + pid.ki * pid.integral + pid.kd * derivative;
}
