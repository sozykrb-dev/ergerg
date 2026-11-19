#!/usr/bin/env node
/**
 * One command: put the MOLFET theme into its own GitHub repository, ready for
 * Shopify's "Connect from GitHub".
 *
 *   node scripts/publish-theme-repo.mjs <owner/repo> [branch]
 *
 * Example
 *   node scripts/publish-theme-repo.mjs sozykrb-dev/molfet-theme main
 *
 * It creates the repository if it does not exist, then pushes the theme
 * CONTENTS so layout/, config/, locales/, sections/, snippets/, assets/ and
 * templates/ sit at the root of the branch — the only layout Shopify accepts.
 *
 * Needs the GitHub CLI (`gh`) logged in. If `gh` is not available, use
 *   node scripts/export-theme-repo.mjs <owner/repo> [branch]
 * after creating the empty repository yourself, or simply upload
 *   molfet-shopify-theme.zip
 * through Add theme → Upload zip file.
 *
 * Why a separate repository at all: Shopify reads the BRANCH ROOT as the theme.
 * It never looks inside a subfolder, so this repository (a React app with the
 * theme in shopify/) can never be connected, whatever the branch.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const themeDir = path.resolve(here, '..', 'shopify');

const [target, branch = 'main'] = process.argv.slice(2);

const THEME_DIRS = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates', 'blocks'];

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

if (!target || !/^[^/\s]+\/[^/\s]+$/.test(target)) {
  fail('Pass the repository as owner/name, for example:\n\n      node scripts/publish-theme-repo.mjs your-name/molfet-theme main');
}
if (!existsSync(path.join(themeDir, 'layout', 'theme.liquid'))) fail('shopify/layout/theme.liquid is missing.');

let slug;
try {
  slug = run('gh', ['api', 'user', '--jq', '.login']);
} catch {
  fail('`gh` is not available or not logged in. Either run `gh auth login`, or create the repository by hand and use scripts/export-theme-repo.mjs, or upload molfet-shopify-theme.zip.');
}

const [owner, name] = target.split('/');
const fullName = `${owner}/${name}`;

console.log(`\n  github account: ${slug}`);
console.log(`  target repo:    ${fullName}`);
console.log(`  branch:         ${branch}\n`);

// 1. Create the repository if needed. A public repo keeps jsDelivr images working.
let created = false;
try {
  run('gh', ['repo', 'view', fullName, '--json', 'name']);
  console.log('  repository already exists — pushing to it');
} catch {
  try {
    run('gh', ['repo', 'create', fullName, '--public', '--description', 'MOLFET — Break the Frame · Shopify Online Store 2.0 theme. Theme folders at the repository root, ready for Connect from GitHub.']);
    created = true;
    console.log('  created the repository');
  } catch (error) {
    const detail = (error.stderr || error.message || '').toString().trim().split('\n').slice(-3).join('\n  ');
    console.error(`\n  ! this GitHub login cannot create repositories automatically.\n`);
    console.error(`  Create it in one click (leave README, .gitignore and license OFF):\n`);
    console.error(`      https://github.com/new?name=${encodeURIComponent(name)}&owner=${encodeURIComponent(owner)}&visibility=public\n`);
    console.error(`  Then run this command again — it will push into the empty repository.\n`);
    console.error(`  Prefer to skip GitHub entirely? Upload molfet-shopify-theme.zip through\n  Online Store → Themes → Add theme → Upload zip file.\n`);
    process.exit(2);
  }
}

// 2. Build the tree: theme contents only, at the root.
const work = mkdtempSync(path.join(tmpdir(), 'molfet-theme-'));
const present = readdirSync(themeDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && THEME_DIRS.includes(e.name))
  .map((e) => e.name)
  .sort();

try {
  console.log(`  theme folders:  ${present.join(', ')}\n`);
  for (const dir of present) {
    cpSync(path.join(themeDir, dir), path.join(work, dir), { recursive: true });
  }

  run('git', ['init', '-q', '-b', branch], work);
  run('git', ['add', '-A'], work);
  run('git', ['-c', 'user.name=MOLFET', '-c', 'user.email=theme@molfet.com', 'commit', '-q', '-m', 'MOLFET theme: theme folders at the repository root'], work);
  // MOLFET_REMOTE lets the push be tested against a local bare repository.
  run('git', ['remote', 'add', 'origin', process.env.MOLFET_REMOTE || `https://github.com/${fullName}.git`], work);
  // Deliberately no --force. Shopify's integration is two-way: edits made in the
  // theme editor are committed back to this branch by a bot, and a forced push
  // would erase them. A first push into an empty repository needs no force.
  run('git', ['push', '-q', '-u', 'origin', branch], work);

  const count = run('git', ['ls-files'], work).split('\n').filter(Boolean).length;
  console.log(`  ✓ pushed ${count} theme files\n`);
  console.log('  Next: Shopify admin → Online Store → Themes → Add theme → Connect from GitHub');
  console.log(`        Repository: ${fullName}`);
  console.log(`        Branch:     ${branch}\n`);
  console.log(`  Or open: https://admin.shopify.com → Themes (the repo is ${created ? 'new' : 'updated'})\n`);
  console.log(`  Repository URL: https://github.com/${fullName}\n`);
} catch (error) {
  const detail = (error.stderr || error.stdout || error.message || '').toString().trim().split('\n').slice(-4).join('\n  ');
  fail(`push failed.\n\n  ${detail}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
