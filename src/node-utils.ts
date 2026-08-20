/**
 * Node-only build-time utilities -- fs/path, never meant to reach a browser
 * bundle. Separate entry point (spectra-lib/node-utils) on purpose, so a
 * bundler importing spectra-lib's other exports never has a reason to touch
 * Node built-ins.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Walk up from `fromDir` looking for `markerRelativePath` (e.g.
 * "identity.json" or "catalog/catalog.json"), up to `maxLevels` levels, and
 * return the first match. Falls back to `dockerFallback` if never found.
 *
 * Extracted from bagStore's vite.config.js (`findCatalog()`), which forked
 * GateOpen's original identity.json-mirroring trick and fixed a real bug in
 * it: a FIXED-DEPTH relative path (`../../../../identity.json`) breaks the
 * moment the app moves to a different directory depth, which is exactly
 * what happened to bagStore when its apps moved from the repo root into
 * beta/apps/<App>/front. A walk-up survives the next move too. GateOpen's
 * own vite.config.js has since been ported to use this same pattern
 * directly (see its git history) -- this is that fix, generalized so a
 * third consumer doesn't have to rediscover it by hitting the same bug.
 *
 * The Docker-fallback case: when a build's context is a bare directory with
 * nothing above it (a Docker build stage copying only `front/`'s contents),
 * walking up will never find the marker -- `dockerFallback` names where the
 * Dockerfile is expected to have COPYd it instead (e.g. "/identity.json").
 *
 * @param fromDir Directory to start searching from (typically `__dirname`).
 * @param markerRelativePath Relative path to look for at each level.
 * @param options.maxLevels How many parent directories to check (default 8).
 * @param options.dockerFallback Absolute path to fall back to if never found
 *   (default: `/` + markerRelativePath).
 */
export function findUp(
  fromDir: string,
  markerRelativePath: string,
  options?: { maxLevels?: number; dockerFallback?: string },
): string {
  const maxLevels = options?.maxLevels ?? 8;
  let dir = fromDir;
  for (let i = 0; i < maxLevels; i += 1) {
    const candidate = path.join(dir, markerRelativePath);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return options?.dockerFallback ?? path.posix.join('/', markerRelativePath);
}
