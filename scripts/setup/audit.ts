/**
 * Fail if tracked files contain secrets or if secret paths are not ignored.
 *
 * Usage:
 *   bun run audit
 *
 * Checks:
 *   1. `git ls-files` output scanned for long token patterns.
 *      Placeholders like ghp_xxx are too short to match.
 *   2. `.env` and `mcp/` must be gitignored so baked MCP
 *      configs can never be committed.
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, execSync } from 'node:child_process'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

export const TOKEN_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/,
  /gho_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /ak2_[A-Za-z0-9_]{10,}/,
  /sk-ant-[A-Za-z0-9-]{10,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /AIza[A-Za-z0-9_-]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /glpat-[A-Za-z0-9_-]{20,}/,
  /fc-[a-f0-9]{16,}/,
  /private_[A-Za-z0-9]{8,}/,
  /xox[bap]-[A-Za-z0-9-]+/,
  // Split so this source line does not match its own pattern.
  new RegExp('-----BEGIN ' + '.*PRIVATE KEY' + '-----'),
]

// Backstop, not a guarantee. Every generated secret-bearing file must be ignored.
export const MUST_BE_IGNORED = [
  '.env',
  '.env.local',
  'mcp/',
  'mcp/zed.json',
  'mcp/claude.json',
  'mcp/claude-code.json',
  'mcp/opencode.json',
  'mcp/codex.json',
  'mcp/lmstudio.json',
]

function trackedFiles(): string[] {
  const out = execSync('git ls-files', { encoding: 'utf-8' })
  return out.split('\n').map(f => f.trim()).filter(Boolean)
}

function isIgnored(filePath: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '-q', filePath])
    return true
  } catch {
    return false
  }
}

export function scanText(source: string, content: string): boolean {
  for (const pattern of TOKEN_PATTERNS) {
    if (pattern.test(content)) {
      console.error(`audit: possible secret (${pattern}) in ${source}`)
      return true
    }
  }
  return false
}

function main() {
  let failed = false

  for (const must of MUST_BE_IGNORED) {
    if (!isIgnored(must)) {
      console.error(`audit: ${must} is not ignored and would leak secrets`)
      failed = true
    }
  }

  for (const file of trackedFiles()) {
    let content: string
    try {
      const stat = fs.statSync(file)
      if (!stat.isFile() || stat.size > 1024 * 1024) continue
      content = fs.readFileSync(file, 'utf-8')
    } catch {
      continue
    }
    if (scanText(`tracked file ${file}`, content)) failed = true
  }

  // Secrets committed then deleted from disk still ship in history.
  try {
    const revs = execFileSync('git', ['rev-list', '--all', '--'], { encoding: 'utf-8' }).trim()
    if (revs) {
      const args = ['grep', '-I', '-E']
      for (const pattern of TOKEN_PATTERNS) args.push('-e', pattern.source)
      const hits = execFileSync('git', [...args, ...revs.split('\n'), '--', '.'], { encoding: 'utf-8' })
      if (hits.trim()) {
        console.error(`audit: possible secret committed in history:\n${hits.trim()}`)
        failed = true
      }
    }
  } catch {
    // git grep exits 1 when nothing matches, which is the clean case.
  }

  if (failed) {
    console.error('audit: FAILED')
    process.exit(1)
  }
  console.log('audit: clean')
}

// Import-safe entrypoint, see install.ts.
function isMain(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href
  } catch {
    return false
  }
}

if (isMain()) main()
