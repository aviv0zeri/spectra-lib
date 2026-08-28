#!/usr/bin/env node
import { scan, loadCatalog, saveCatalog, findEntry, resolveRelatedFiles } from '../dist/ui-catalog.js';

const [, , cmd, ...rest] = process.argv;
const projectRoot = process.cwd();

function printEntry(id, entry) {
  console.log(`${id}  (${entry.platform}/${entry.type})  ${entry.name}`);
  console.log(`  entry: ${entry.entry}`);
  if (entry.related_files?.length) console.log(`  related_files: ${entry.related_files.join(', ')}`);
  if (entry.components?.length) console.log(`  components: ${entry.components.join(', ')}`);
}

if (cmd === 'scan') {
  const write = rest.includes('--write');
  const { proposed, added, missing } = scan(projectRoot);
  if (!added.length && !missing.length) {
    console.log('spectra-ui.yml is already up to date with what scan finds.');
  } else {
    if (added.length) {
      console.log('New surfaces found (not yet in spectra-ui.yml):');
      for (const a of added) console.log(`  + ${a.id}  (${a.platform}/${a.bucket})`);
    }
    if (missing.length) {
      console.log('Catalog entries whose source file no longer exists:');
      for (const m of missing) console.log(`  - ${m.id}  (${m.platform}/${m.bucket})`);
    }
  }
  if (write) {
    saveCatalog(projectRoot, proposed);
    console.log('\nWrote spectra-ui.yml.');
  } else if (added.length || missing.length) {
    console.log('\nRun again with --write to apply this proposal.');
  }
} else if (cmd === 'list') {
  const catalog = loadCatalog(projectRoot);
  for (const [platform, buckets] of Object.entries(catalog)) {
    for (const [bucket, entries] of Object.entries(buckets)) {
      for (const [id, entry] of Object.entries(entries)) {
        console.log(`${id}\t${platform}/${bucket}\t${entry.type}\t${entry.entry}`);
      }
    }
  }
} else if (cmd === 'inspect') {
  const id = rest[0];
  if (!id) {
    console.error('usage: spectra-ui inspect <id>');
    process.exit(1);
  }
  const catalog = loadCatalog(projectRoot);
  const entry = findEntry(catalog, id);
  if (!entry) {
    console.error(`no catalog entry with id "${id}"`);
    process.exit(1);
  }
  // Re-derive related_files live from the current source file, rather than
  // trusting whatever scan last wrote -- inspect always answers "what's
  // true right now", the same discipline review_aggregator.py uses for PR
  // review state.
  entry.related_files = resolveRelatedFiles(projectRoot, entry.entry);
  printEntry(id, entry);
} else {
  console.error('usage: spectra-ui <scan [--write] | list | inspect <id>>');
  process.exit(1);
}
