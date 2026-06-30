/*
 * Constants.
 */

/** Canonical site URL (set when deploying). */
export const siteUrl = 'https://greglinscheid.com';

export const siteTitle = 'Greg Linscheid';

export const siteDescription = 'A personal website for Greg Linscheid';

/*
 * Helpers.
 */

export function formatTitle(pageTitle: string) {
  return `${siteTitle} | ${pageTitle}`;
}

export {activeProjects, olderProjects, tools, workspaceTools} from './data/projects';
export type {Project, ProjectDetail, ProjectDetailPart} from './data/projects';
