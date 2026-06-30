/// <reference lib="webworker" />
import type {EmitMode} from './emit';
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
  ctx.postMessage(emitReply(mesh, request.id, request.orientation, request.mode));
};

/*
 * Helpers.
 */

function emitReply(loaded: LoadedMesh, id: number, orientation: Mat3, mode: EmitMode): WorkerReply {
  try {
    return {type: 'svg', id, svg: renderSvg(loaded, orientation, mode)};
  } catch (error) {
    return {type: 'error', id, message: error instanceof Error ? error.message : 'Silhouette failed'};
  }
}

function renderSvg(loaded: LoadedMesh, orientation: Mat3, mode: EmitMode): string {
  if (mode === 'shaded') {
    return emitShadedSvg(projectAndCull(loaded, orientation), projectShaded(loaded, orientation));
  }
  return emitFlatSvg(projectAndCull(loaded, orientation));
}
