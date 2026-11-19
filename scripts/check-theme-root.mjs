#!/usr/bin/env node
/**
 * Will Shopify accept a branch as a theme?
 *
 * Shopify's "Connect from GitHub" only accepts a branch whose ROOT holds the
 * theme folders. Run this against the folder you intend to push.
 *
 *   node scripts/check-theme-root.mjs            # checks ./shopify
 *   node scripts/check-theme-root.mjs ./some/dir
 *
 * Exit code 0 means the layout is acceptable.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || 'shopify');

const THEME_DIRS = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates'];
const REQUIRED = [
  ['layout/theme.liquid', 'the one file every uploadable theme must have'],
  ['config/settings_schema.json', 'the theme editor refuses to open without it'],
  ['config/settings_data.json', 'the saved values Shopify reads on connect'],
  ['locales/en.default.json', 'default translations'],
];

const problems = [];
const warnings = [];

if (!existsSync(dir)) {
  console.error(`\n  ✗ ${dir} does not exist\n`);
  process.exit(1);
}

function isDir(p) {
  return existsSync(p) && statSync(p).isDirectory();
}

console.log(`\n  checking: ${dir}\n`);

for (const [rel, why] of REQUIRED) {
  const full = path.join(dir, rel);
  const ok = existsSync(full);
  console.log(`  ${ok ? 'OK  ' : 'MISS'} ${rel.padEnd(30)} ${why}`);
  if (!ok) problems.push(`missing ${rel}`);
}

const present = THEME_DIRS.filter((d) => isDir(path.join(dir, d)));
console.log(`\n  theme folders present: ${present.join(', ') || 'none'}`);
if (present.length === 0) problems.push('no theme folders at this level');

// A nested theme folder is the single most common reason for the error.
const nested = readdirSync(dir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git')
  .filter((e) => existsSync(path.join(dir, e.name, 'layout', 'theme.liquid')))
  .map((e) => e.name);
if (nested.length) {
  problems.push(`theme is nested inside: ${nested.join(', ')} — push its CONTENTS to the branch root, not the folder`);
}

// Unrelated app files at the root are ignored by Shopify, but they mean you are
// pointing the connection at the wrong repository.
const appFiles = ['package.json', 'vite.config.ts', 'server.ts', 'src'].filter((f) => existsSync(path.join(dir, f)));
if (appFiles.length) {
  warnings.push(`this looks like an app repository too (${appFiles.join(', ')}) — connect a repo that holds only the theme`);
}

console.log();
for (const w of warnings) console.log(`  ! ${w}`);
for (const p of problems) console.log(`  ✗ ${p}`);

if (problems.length) {
  console.log('\n  RESULT: Shopify will reject this branch.\n');
  process.exit(1);
}

console.log('\n  RESULT: layout acceptable — both "Upload zip" and "Connect from GitHub" accept this.\n');
