#!/usr/bin/env node
/**
 * check-rtl.mjs
 *
 * RTL sanity linter for the Ihyaa frontend.
 *
 * This project is Arabic-first and RTL. Tailwind's *physical* spacing/inset
 * utilities (ml-, mr-, pl-, pr-, left-*, right-*) and physical text alignment
 * (text-left / text-right) flip meaning in RTL layouts. Code must use the
 * *logical* utilities instead: ms- / me- / ps- / pe- / start- / end- /
 * text-start / text-end.
 *
 * The script walks every `.js` / `.jsx` file under `src/`, strips JS/JSX
 * comments, and reports any occurrence of the forbidden physical utilities
 * together with a hint. It exits with code 1 if at least one violation is
 * found, so it can be wired into CI / pre-commit.
 *
 * Usage:
 *   npm run check:rtl
 *   node scripts/check-rtl.mjs [--json]
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC_DIR = join(ROOT, 'src');
const EXTS = new Set(['.js', '.jsx']);

// Forbidden physical utilities -> logical replacement hint.
// Each rule captures the full class token (e.g. `ml-4`, `left-1/2`).
const PATTERNS = [
  { re: /\bml-[^\s"'`]*/g,   rule: 'ml-*',        hint: 'margin-inline-start -> use ms-*' },
  { re: /\bmr-[^\s"'`]*/g,   rule: 'mr-*',        hint: 'margin-inline-end   -> use me-*' },
  { re: /\bpl-[^\s"'`]*/g,   rule: 'pl-*',        hint: 'padding-inline-start -> use ps-*' },
  { re: /\bpr-[^\s"'`]*/g,   rule: 'pr-*',        hint: 'padding-inline-end   -> use pe-*' },
  { re: /\bleft-[^\s"'`]*/g, rule: 'left-*',      hint: 'inset-inline-start  -> use start-*' },
  { re: /\bright-[^\s"'`]*/g, rule: 'right-*',    hint: 'inset-inline-end    -> use end-*' },
  { re: /\btext-left(?![\w-])/g,  rule: 'text-left',  hint: 'text-align start -> use text-start' },
  { re: /\btext-right(?![\w-])/g, rule: 'text-right', hint: 'text-align end   -> use text-end' },
];

const WANT_JSON = process.argv.includes('--json');

/**
 * Remove line comments (//) and block comments (slash-star ... star-slash,
 * including the JSX comment form) while preserving string literals and
 * template literals, so class names written inside className="..." or
 * className={template} are still checked. Newlines are kept so reported line
 * numbers match the original file.
 */
function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];
    const next = src[i + 1];

    // Line comment: // ... (but not a URL like https:// which is a string anyway)
    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }

    // Block / JSX comment: /* ... */ or {/* ... */}
    if (c === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      i += 2; // skip the closing '*/'
      continue;
    }

    // Single / double quoted string literal — copy verbatim (newlines allowed).
    if (c === '"' || c === "'") {
      out += c;
      i++;
      while (i < n) {
        out += src[i];
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === c) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Template literal — copy verbatim so className={`ml-4 ...`} is checked.
    if (c === '`') {
      out += c;
      i++;
      while (i < n) {
        out += src[i];
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === '`') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    out += c;
    i++;
  }

  return out;
}

function walk(dir, files) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue; // broken symlink etc.
    }
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(full, files);
    } else if (st.isFile() && EXTS.has(extname(entry))) {
      files.push(full);
    }
  }
}

const files = [];
walk(SRC_DIR, files);

const allViolations = [];

for (const file of files) {
  const rel = relative(SRC_DIR, file);
  const stripped = stripComments(readFileSync(file, 'utf8'));
  const lines = stripped.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of PATTERNS) {
      let m;
      while ((m = p.re.exec(line)) !== null) {
        allViolations.push({
          file: rel,
          line: i + 1,
          col: m.index + 1,
          token: m[0],
          rule: p.rule,
          hint: p.hint,
        });
      }
    }
  }
}

if (WANT_JSON) {
  console.log(JSON.stringify({ ok: allViolations.length === 0, violations: allViolations }, null, 2));
} else if (allViolations.length === 0) {
  console.log('check:rtl ✓ — no physical RTL/spacing utilities found in src/.');
} else {
  let lastFile = null;
  for (const v of allViolations) {
    if (v.file !== lastFile) {
      console.log(`\n${v.file}`);
      lastFile = v.file;
    }
    console.log(`  ${String(v.line).padStart(4)}:${String(v.col).padEnd(3)}  ${v.token.padEnd(18)} ${v.hint}`);
  }
  console.log(`\ncheck:rtl ✗ — ${allViolations.length} violation(s). Replace physical utilities with logical ones (start/end/ms/me/ps/pe/text-start/text-end).`);
}

process.exit(allViolations.length === 0 ? 0 : 1);
