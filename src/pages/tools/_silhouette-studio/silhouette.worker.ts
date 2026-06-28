/// <reference lib="webworker" />
import type {EmitOptions} from './emit';
import {emitFlatSvg} from './emit';
import type {LoadedMesh, Mat3} from './geometry';
import {projectAndCull} from './geometry';
import type {WorkerReply, WorkerRequest} from './protocol';

/*
 * Script.
 */

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let mesh: LoadedMesh | undefined;

/**
 * Run the clipper silhouette off the main thread.
 * @sideEffect Holds the current mesh and posts SVG/error replies.
 */
ctx.onmessage = (event: MessageEvent<WorkerRequest>): void => {
  const request = event.data;
  if (request.type === 'mesh') {
    mesh = request.mesh;
    return;
  }
  if (mesh === undefined) {
    return;
  }
  ctx.postMessage(emitReply(mesh, request.id, request.orientation, request.options));
};

/*
 * Helpers.
 */

function emitReply(loaded: LoadedMesh, id: number, orientation: Mat3, options: EmitOptions): WorkerReply {
  try {
    const scene = projectAndCull(loaded, orientation);
    return {type: 'svg', id, svg: emitFlatSvg(scene, options)};
  } catch (error) {
    return {type: 'error', id, message: error instanceof Error ? error.message : 'Silhouette failed'};
  }
}
