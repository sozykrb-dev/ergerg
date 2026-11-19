#!/usr/bin/env node
/**
 * Put the MOLFET theme at the ROOT of a git repository, so Shopify's
 * "Connect from GitHub" accepts the branch.
 *
 * Shopify reads a branch as a theme only when these sit at the branch root:
 *
 *   layout/theme.liquid   config/settings_schema.json   config/settings_data.json
 *
 * In this repository the theme lives in shopify/, next to the React app, so the
 * branch is correctly rejected as "not a valid theme". This script copies the
 * theme contents to a temporary folder, initialises git there, commits, and
 * pushes to a repository of your own. Only theme files are pushed — no app, no
 * docs, no zip.
 *
 * Usage
 *   node scripts/export-theme-repo.mjs <owner/repo> [branch]
 *
 * Example
 *   node scripts/export-theme-repo.mjs your-name/molfet-theme main
 *
 * Create the empty repository on GitHub first (no README, no .gitignore), then
 * run this. Afterwards: Shopify admin → Online Store → Themes → Add theme →
 * Connect from GitHub → pick that repo and branch.
 *
 * If you would rather not use a second repository, upload the zip instead:
 * Add theme → Upload zip → molfet-shopify-theme.zip
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const themeDir = path.join(repoRoot, 'shopify');

const [target, branch = 'main'] = process.argv.slice(2);

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

if (!target || !/^[^/\s]+\/[^/\s]+$/.test(target)) {
  fail('Pass the repository as owner/name, for example: node scripts/export-theme-repo.mjs your-name/molfet-theme main');
}

if (!existsSync(themeDir)) fail(`No theme found at ${themeDir}`);
if (!existsSync(path.join(themeDir, 'layout', 'theme.liquid'))) fail('shopify/layout/theme.liquid is missing.');
if (!existsSync(path.join(themeDir, 'config', 'settings_schema.json'))) fail('shopify/config/settings_schema.json is missing.');

// Only the folders Shopify packages. Anything else at the root is ignored by
// the integration at best, and a reason for confusion at worst.
const THEME_DIRS = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates', 'blocks'];
const present = readdirSync(themeDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && THEME_DIRS.includes(entry.name))
  .map((entry) => entry.name);

console.log(`\n  theme:   ${themeDir}`);
console.log(`  folders: ${present.join(', ')}`);
console.log(`  target:  ${target} (branch ${branch})\n`);

const work = mkdtempSync(path.join(tmpdir(), 'molfet-theme-'));

try {
  for (const dir of present) {
    cpSync(path.join(themeDir, dir), path.join(work, dir), { recursive: true });
  }

  // A short note at the root is allowed and does not confuse the integration.
  writeFileSync(
    path.join(work, 'README.md'),
    [
      '# MOLFET — Break the Frame',
      '',
      'Shopify Online Store 2.0 theme. The theme folders sit at the root of this',
      'repository on purpose: that is the layout Shopify\'s "Connect from GitHub"',
      'accepts.',
      '',
      'Connect it in the Shopify admin:',
      '',
      '1. Online Store → Themes → Add theme → **Connect from GitHub**',
      '2. Choose this repository and the `' + branch + '` branch.',
      '',
      'Verified layout requirements:',
      '',
      '- `layout/theme.liquid`',
      '- `config/settings_schema.json` and `config/settings_data.json`',
      '- `templates/*.json`, `sections/`, `snippets/`, `assets/`, `locales/`',
      '',
    ].join('\n'),
  );

  git(['init', '-q', '-b', branch], work);
  git(['add', '-A'], work);
  git(
    ['-c', 'user.name=MOLFET', '-c', 'user.email=theme@molfet.com', 'commit', '-q', '-m', 'MOLFET theme: theme files at the repository root'],
    work,
  );

  // MOLFET_REMOTE exists so the script can be tested against a local bare repo.
  const remote = process.env.MOLFET_REMOTE || `https://github.com/${target}.git`;
  git(['remote', 'add', 'origin', remote], work);
  git(['push', '-u', 'origin', branch], work);

  const files = git(['ls-files'], work).split('\n').filter(Boolean).length;
  console.log(`  ✓ pushed ${files} theme files to ${target} (${branch})\n`);
  console.log('  Next: Shopify admin → Online Store → Themes → Add theme → Connect from GitHub');
  console.log(`        repository ${target}, branch ${branch}\n`);
} catch (error) {
  const detail = (error.stderr || error.stdout || error.message || '').toString().trim();
  fail(`push failed.\n\n  ${detail.split('\n').slice(-4).join('\n  ')}\n\n  Check the repository exists and is empty, and that this machine can push to it.`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
