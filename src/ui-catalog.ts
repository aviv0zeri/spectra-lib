/**
 * Node-only UI catalog scanner/reader -- deterministic code analysis
 * (directory conventions + regex-based import parsing), not an attempt at
 * perfect semantic discovery. A project's actual catalog lives in that
 * project's own `spectra-ui.yml`; this module only proposes entries for it
 * (scan) and reads it back (list/inspect). It never writes on its own --
 * the CLI's `--write` flag is the only thing that persists a proposal, so a
 * scan can never silently rewrite a project's catalog out from under it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export type SurfaceType = 'page' | 'screen' | 'component' | 'section';

export interface CatalogEntry {
  name: string;
  platform: string;
  type: SurfaceType;
  entry: string;
  category?: string;
  related_files?: string[];
  components?: string[];
}

export type Catalog = Record<string, Record<string, Record<string, CatalogEntry>>>;
// Catalog[platform][bucket][id] = entry -- `bucket` is a free-form grouping
// (e.g. "pages"/"components") chosen by the project's own manifest; scan()
// only ever proposes into buckets named after the SurfaceType it found
// (pluralized: "pages", "components") and leaves anything else alone.

interface ScanRoot {
  platform: string;
  type: SurfaceType;
  dir: string; // relative to project root
}

const DEFAULT_ROOTS: ScanRoot[] = [
  { platform: 'web', type: 'page', dir: 'frontend/src/pages' },
  { platform: 'web', type: 'component', dir: 'frontend/src/components' },
];

const SOURCE_EXT = /\.(jsx?|tsx?)$/;
const IMPORT_RE = /import\s+(?:[\w*{}\s,]+\s+from\s+)?["'](\.[^"']+)["']/g;

function toId(fileBase: string): string {
  return fileBase
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function toName(fileBase: string): string {
  return fileBase;
}

function bucketFor(type: SurfaceType): string {
  return { page: 'pages', screen: 'screens', component: 'components', section: 'sections' }[type];
}

function listSourceFiles(absDir: string): string[] {
  if (!fs.existsSync(absDir)) return [];
  return fs
    .readdirSync(absDir, { withFileTypes: true })
    .filter((e) => e.isFile() && SOURCE_EXT.test(e.name))
    .map((e) => e.name);
}

/** Relative imports resolved to project-root-relative paths that actually
 * exist on disk -- external package imports (no leading `.`) are not
 * related_files, they're dependencies, a different question. */
export function resolveRelatedFiles(projectRoot: string, entryRelPath: string): string[] {
  const abs = path.join(projectRoot, entryRelPath);
  const src = fs.readFileSync(abs, 'utf8');
  const dir = path.dirname(abs);
  const related: string[] = [];
  for (const m of src.matchAll(IMPORT_RE)) {
    const resolved = path.resolve(dir, m[1]);
    const relFromRoot = path.relative(projectRoot, resolved);
    if (fs.existsSync(resolved)) related.push(relFromRoot);
  }
  return related;
}

/** Component names a page/section pulls in -- the subset of related_files
 * whose entry currently exists in the catalog as a `component` (looked up
 * by matching file path, not guessed). Empty if the catalog doesn't know
 * about any of them yet -- scan() still proposes the entry itself either
 * way, just without a `components` list until a second pass sees them. */
function componentsAmong(relatedFiles: string[], catalog: Catalog): string[] {
  const byEntry = new Map<string, string>(); // entry path -> id
  for (const platform of Object.values(catalog)) {
    for (const bucket of Object.values(platform)) {
      for (const [id, entry] of Object.entries(bucket)) {
        if (entry.type === 'component') byEntry.set(entry.entry, id);
      }
    }
  }
  return relatedFiles.map((f) => byEntry.get(f)).filter((x): x is string => Boolean(x));
}

export function loadCatalog(projectRoot: string, manifestPath = 'spectra-ui.yml'): Catalog {
  const abs = path.join(projectRoot, manifestPath);
  if (!fs.existsSync(abs)) return {};
  const parsed = parseYaml(fs.readFileSync(abs, 'utf8'));
  return parsed || {};
}

export function saveCatalog(projectRoot: string, catalog: Catalog, manifestPath = 'spectra-ui.yml'): void {
  const abs = path.join(projectRoot, manifestPath);
  fs.writeFileSync(abs, stringifyYaml(catalog));
}

export interface ScanResult {
  proposed: Catalog;
  added: { platform: string; bucket: string; id: string }[];
  missing: { platform: string; bucket: string; id: string }[]; // in manifest, file no longer exists
}

/** Deterministic discovery: walk each configured root directory, one entry
 * per source file found there. Never touches anything outside `roots`'
 * directories or infers a "type" beyond what the root it was found under
 * says -- no attempt to guess "this file is secretly a page" from its
 * content. `roots` defaults to the web pages/components convention; a
 * project with a different layout (or a mobile/screens tree, once Phase 2
 * needs it) passes its own. */
export function scan(projectRoot: string, opts?: { roots?: ScanRoot[]; manifestPath?: string }): ScanResult {
  const roots = opts?.roots ?? DEFAULT_ROOTS;
  const manifestPath = opts?.manifestPath ?? 'spectra-ui.yml';
  const existing = loadCatalog(projectRoot, manifestPath);
  const proposed: Catalog = JSON.parse(JSON.stringify(existing));
  const added: ScanResult['added'] = [];
  const seenEntryPaths = new Set<string>();

  for (const root of roots) {
    const bucket = bucketFor(root.type);
    const files = listSourceFiles(path.join(projectRoot, root.dir));
    for (const file of files) {
      const base = file.replace(SOURCE_EXT, '');
      const id = toId(base);
      const entryRelPath = path.join(root.dir, file);
      seenEntryPaths.add(entryRelPath);
      const relatedFiles = resolveRelatedFiles(projectRoot, entryRelPath);

      proposed[root.platform] ??= {};
      proposed[root.platform][bucket] ??= {};
      const already = proposed[root.platform][bucket][id];
      proposed[root.platform][bucket][id] = {
        name: already?.name ?? toName(base),
        platform: root.platform,
        type: root.type,
        entry: entryRelPath,
        ...(already?.category ? { category: already.category } : {}),
        related_files: relatedFiles,
      };
      if (!already) added.push({ platform: root.platform, bucket, id });
    }
  }

  // Second pass: now that every scanned entry is in `proposed`, resolve
  // each page/section's `components` list from its related_files.
  for (const platform of Object.values(proposed)) {
    for (const bucket of Object.values(platform)) {
      for (const entry of Object.values(bucket)) {
        if (entry.type === 'page' || entry.type === 'section' || entry.type === 'screen') {
          const comps = componentsAmong(entry.related_files ?? [], proposed);
          if (comps.length) entry.components = comps;
        }
      }
    }
  }

  const missing: ScanResult['missing'] = [];
  for (const [platform, buckets] of Object.entries(existing)) {
    for (const [bucket, entries] of Object.entries(buckets)) {
      for (const [id, entry] of Object.entries(entries)) {
        const abs = path.join(projectRoot, entry.entry);
        if (!fs.existsSync(abs)) {
          missing.push({ platform, bucket, id });
          delete proposed[platform]?.[bucket]?.[id];
        }
      }
    }
  }

  return { proposed, added, missing };
}

export function findEntry(catalog: Catalog, id: string): (CatalogEntry & { platform: string; bucket: string }) | null {
  for (const [platform, buckets] of Object.entries(catalog)) {
    for (const [bucket, entries] of Object.entries(buckets)) {
      if (entries[id]) return { ...entries[id], platform, bucket };
    }
  }
  return null;
}
