import type {EmitMode} from './emit';
import type {LoadedMesh, Mat3} from './geometry';

/*
 * Types.
 */

// Main thread → worker.
export type WorkerRequest =
  | {type: 'mesh'; mesh: LoadedMesh}
  | {type: 'emit'; id: number; orientation: Mat3; mode: EmitMode};

// Worker → main thread.
export type WorkerReply =
  | {type: 'svg'; id: number; svg: string}
  | {type: 'error'; id: number; message: string};
