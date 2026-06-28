/// <reference lib="webworker" />
import type {EmitOptions} from './emit';
import {emitFlatSvg, emitShadedSvg} from './emit';
import type {LoadedMesh, Mat3} from './geometry';
import {projectAndCull, projectShaded} from './geometry';
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
  ctx.postMessage(emitReply(mesh, request.id, request.orientation, request.options, request.shaded));
};

/*
 * Helpers.
 */

function emitReply(
  loaded: LoadedMesh,
  id: number,
  orientation: Mat3,
  options: EmitOptions,
  shaded: boolean
): WorkerReply {
  try {
    const svg = shaded
      ? emitShadedSvg(projectShaded(loaded, orientation), options)
      : emitFlatSvg(projectAndCull(loaded, orientation), options);
    return {type: 'svg', id, svg};
  } catch (error) {
    return {type: 'error', id, message: error instanceof Error ? error.message : 'Silhouette failed'};
  }
}
