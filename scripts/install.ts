/**
 * Install MCP configs to their platform-specific system locations.
 *
 * Merge strategy: managed servers from ./mcp/*.json are merged
 * per-server into the existing config. Local custom servers are
 * preserved. Nothing outside the MCP keys is touched.
 *
 * Safety: a timestamped .bak is written before any change, and
 * symlinked destinations are replaced by regular files so generated
 * secrets never leak back into the dotfiles repo.
 *
 * Usage:
 *   bun run install:all      # installs to all platforms
 *   bun run install:zed       # installs only Zed
 *
 * Inspired by theme-artlab/scripts/install.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const home = process.env.HOME || process.env.USERPROFILE || ''
if (!home) {
  console.error('HOME is unset, refusing to guess install locations.')
  process.exit(1)
}

// Repo root resolved from this file, never from the caller cwd.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fromRepo = (p: string) => path.join(repo, p)

// ── Target paths ────────────────────────────────────────────────

function getTargets() {
  return {
    zed: path.join(home, '.config', 'zed', 'settings.json'),
    claude: path.join(
      home,
      'Library',
      'Application Support',
      'Claude Desktop',
      'claude_desktop_config.json',
    ),
    claudeCode: path.join(home, '.claude.json'),
    claudeCodeDir: path.join(home, '.claude'),
    opencode: path.join(home, '.config', 'opencode', 'opencode.jsonc'),
    opencodeDir: path.join(home, '.config', 'opencode'),
    lmstudio: path.join(home, '.lmstudio', 'mcp.json'),
  }
}

// ── Helpers ─────────────────────────────────────────────────────

/** Strip JSONC comments and trailing commas, respecting string literals. */
function stripJsonc(text: string): string {
  let out = ''
  let i = 0
  let quote = ''
  while (i < text.length) {
    const c = text[i]
    if (quote) {
      out += c
      if (c === '\\') {
        out += text[i + 1] ?? ''
        i += 2
        continue
      }
      if (c === quote) quote = ''
      i += 1
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      out += c
      i += 1
      continue
    }
    if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1
      continue
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1
      i += 2
      continue
    }
    if (c === ',' ) {
      let j = i + 1
      for (;;) {
        while (j < text.length && /\s/.test(text[j])) j += 1
        if (text[j] === '/' && text[j + 1] === '/') {
          while (j < text.length && text[j] !== '\n') j += 1
          continue
        }
        if (text[j] === '/' && text[j + 1] === '*') {
          j += 2
          while (j < text.length && !(text[j] === '*' && text[j + 1] === '/')) j += 1
          j += 2
          continue
        }
        break
      }
      if (text[j] === '}' || text[j] === ']') {
        i += 1
        continue
      }
    }
    out += c
    i += 1
  }
  return out
}

interface ReadResult {
  data: any
  missing: boolean
  corrupt: boolean
}

function readJsonSafe(filePath: string): ReadResult {
  let raw: string
  try {
    raw = fs.readFileSync(filePath, 'utf-8')
  } catch {
    return { data: {}, missing: true, corrupt: false }
  }
  try {
    return { data: JSON.parse(stripJsonc(raw)), missing: false, corrupt: false }
  } catch {
    return { data: {}, missing: false, corrupt: true }
  }
}

/** Order-insensitive deep equality for parsed JSON values. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, (b as unknown[])[i]))
  }
  const ao = a as Record<string, unknown>
  const bo = b as Record<string, unknown>
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)])
  return [...keys].every(k => deepEqual(ao[k], bo[k]))
}

function writeJson(filePath: string, data: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  try {
    const existing = JSON.parse(stripJsonc(fs.readFileSync(filePath, 'utf-8')))
    if (deepEqual(existing, data)) {
      console.log(`  = ${filePath} (unchanged)`)
      return
    }
  } catch {
    // Unreadable or missing, continue to write below.
  }
  try {
    if (fs.lstatSync(filePath).isSymbolicLink()) {
      fs.unlinkSync(filePath)
      console.log(`  ↪ replaced symlink with regular file: ${filePath}`)
    } else {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      fs.copyFileSync(filePath, `${filePath}.bak-${stamp}`)
    }
  } catch {
    // No existing file, nothing to back up.
  }
  // Write back as .jsonc (keep the extension)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
  console.log(`  ✓ ${filePath}`)
}

/** Merge generated servers into existing ones, preserving local extras. */
function mergeServers(current: any, generated: any): any {
  return { ...(current ?? {}), ...generated }
}

// ── Installers (MCP configs) ────────────────────────────────────

function installZed(): boolean {
  const { zed: zedPath } = getTargets()
  const mcpRead = readJsonSafe(fromRepo('./mcp/zed.json'))
  if (mcpRead.missing || mcpRead.corrupt) {
    console.error('  ✗ ./mcp/zed.json is missing or invalid. Run "bun run build" first.')
    return false
  }
  const mcpConfig = mcpRead.data
  const read = readJsonSafe(zedPath)

  if (read.corrupt) {
    console.error(`  ✗ ${zedPath} is not valid JSONC. Fix it manually, nothing was written.`)
    return false
  }
  // Fresh machine: seed base settings from the repo template so the
  // theme and editor options survive. copyIfMissing would no-op later.
  let current: Record<string, unknown>
  if (read.missing) {
    const seed = readJsonSafe(fromRepo('./config/zed/settings.json'))
    current = !seed.missing && !seed.corrupt ? structuredClone(seed.data) : {}
  } else {
    current = read.data
  }

  // Merge only the context_servers key into the existing settings
  current.context_servers = mergeServers(current.context_servers, mcpConfig.context_servers ?? {})

  writeJson(zedPath, current)
  console.log('  → Restart Zed (or run "zed: reload settings")')
  return true
}

function installClaude(): boolean {
  const { claude: claudePath } = getTargets()
  const mcpRead = readJsonSafe(fromRepo('./mcp/claude.json'))
  if (mcpRead.missing || mcpRead.corrupt) {
    console.error('  ✗ ./mcp/claude.json is missing or invalid. Run "bun run build" first.')
    return false
  }
  const mcpConfig = mcpRead.data
  const read = readJsonSafe(claudePath)

  if (read.corrupt) {
    console.error(`  ✗ ${claudePath} is not valid JSONC. Fix it manually, nothing was written.`)
    return false
  }
  const current = read.data

  // Merge mcpServers, preserving local custom servers
  current.mcpServers = mergeServers(current.mcpServers, mcpConfig.mcpServers ?? {})

  writeJson(claudePath, current)
  console.log('  → Restart Claude Desktop')
  return true
}

function installClaudeCode(): boolean {
  const { claudeCode: claudeCodePath } = getTargets()
  const mcpRead = readJsonSafe(fromRepo('./mcp/claude-code.json'))
  if (mcpRead.missing || mcpRead.corrupt) {
    console.error('  ✗ ./mcp/claude-code.json is missing or invalid. Run "bun run build" first.')
    return false
  }
  const mcpConfig = mcpRead.data

  const read = readJsonSafe(claudeCodePath)
  if (read.corrupt) {
    console.error(`  ✗ ${claudeCodePath} is not valid JSON. Fix it manually, nothing was written.`)
    return false
  }
  const current = read.data
  const projectPath = process.cwd()
  console.log(`  project entry: ${projectPath}`)

  // Ensure the project entry exists
  if (!current.projects) current.projects = {}
  if (!current.projects[projectPath]) current.projects[projectPath] = {}

  // Set mcpServers under the current project
  const existing = current.projects[projectPath].mcpServers
  current.projects[projectPath].mcpServers = mergeServers(existing, mcpConfig.mcpServers ?? {})

  writeJson(claudeCodePath, current)
  console.log(`  → Restart Claude Code (or reload with Ctrl+R)`)
  return true
}

// ── Managed settings (Zed principle applied to Claude Code) ─────
// The repo template holds versioned keys (e.g. extraKnownMarketplaces).
// They are merged into the live settings, machine-specific keys like
// hooks are preserved. Same pattern as context_servers for Zed.
function installClaudeCodeSettings(): boolean {
  const { claudeCodeDir } = getTargets()
  const templateRead = readJsonSafe(fromRepo('./config/claude/settings.json'))
  if (templateRead.corrupt || templateRead.missing) {
    console.error('  ✗ ./config/claude/settings.json is missing or invalid. Nothing was written.')
    return false
  }
  const template = templateRead.data
  const settingsPath = path.join(claudeCodeDir, 'settings.json')
  const read = readJsonSafe(settingsPath)
  if (read.corrupt) {
    console.error(`  ✗ ${settingsPath} is not valid JSON. Fix it manually, nothing was written.`)
    return false
  }
  const current = read.data

  for (const [key, value] of Object.entries(template)) {
    const existing = (current as Record<string, unknown>)[key]
    if (
      existing !== null &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      ;(current as Record<string, unknown>)[key] = { ...(existing as object), ...(value as object) }
    } else {
      ;(current as Record<string, unknown>)[key] = value
    }
  }

  writeJson(settingsPath, current)
  return true
}

function installOpenCode(): boolean {
  const { opencode: opencodePath } = getTargets()
  const mcpRead = readJsonSafe(fromRepo('./mcp/opencode.json'))
  if (mcpRead.missing || mcpRead.corrupt) {
    console.error('  ✗ ./mcp/opencode.json is missing or invalid. Run "bun run build" first.')
    return false
  }
  const mcpConfig = mcpRead.data

  // OpenCode config is JSONC (may have comments). We read/write as plain JSON
  // to avoid stripping comments. For full JSONC preservation, manually merge.
  const read = readJsonSafe(opencodePath)
  if (read.corrupt) {
    console.error(`  ✗ ${opencodePath} is not valid JSONC. Fix it manually, nothing was written.`)
    return false
  }
  // Fresh machine: seed base settings from the repo template.
  let current: Record<string, unknown>
  if (read.missing) {
    const seed = readJsonSafe(fromRepo('./config/opencode/opencode.jsonc'))
    current = !seed.missing && !seed.corrupt ? structuredClone(seed.data) : {}
  } else {
    current = read.data
  }

  // Merge the mcp section, preserving local custom servers
  current.mcp = mergeServers(current.mcp, mcpConfig.mcp ?? {})

  writeJson(opencodePath, current)
  console.log('  → Restart OpenCode')
  return true
}

// ── Installers (Codex CLI, TOML text merge) ───────────────────────
// Codex stores MCP servers as [mcp_servers.<name>] tables in the TOML
// file ~/.codex/config.toml alongside unrelated state (hooks, plugins,
// desktop). A TOML round trip would reformat the whole file, so managed
// sections are merged as text: existing managed sections are replaced,
// everything else is preserved byte for byte.

const CODEX_MANAGED_MARKER = '# Managed by dotfiles (scripts/servers.ts). Managed [mcp_servers.*] entries below are overwritten on install.'

/** Quote a value as a TOML basic string. */
function tomlString(value: string): string {
  return JSON.stringify(value)
}

function renderCodexBlock(name: string, server: any): string {
  const lines = [`[mcp_servers.${name}]`]
  if (server && typeof server.url === 'string') {
    lines.push(`url = ${tomlString(server.url)}`)
  } else {
    lines.push(`command = ${tomlString(server.command ?? '')}`)
    if (Array.isArray(server.args) && server.args.length > 0) {
      lines.push(`args = [${server.args.map((a: string) => tomlString(a)).join(', ')}]`)
    }
    if (server.env && Object.keys(server.env).length > 0) {
      lines.push('')
      lines.push(`[mcp_servers.${name}.env]`)
      for (const [key, value] of Object.entries(server.env)) {
        lines.push(`${key} = ${tomlString(value as string)}`)
      }
    }
  }
  return lines.join('\n')
}

/** Base server name for an [mcp_servers.<name>] header, or null. */
function codexSectionOwner(header: string, managed: Set<string>): string | null {
  const prefix = 'mcp_servers.'
  if (!header.startsWith(prefix)) return null
  const base = header.slice(prefix.length).split('.')[0]
  return managed.has(base) ? base : null
}

function mergeCodexToml(current: string, generated: Record<string, any>): string {
  const managed = new Set(Object.keys(generated))
  const kept: string[] = []
  const lines = current.split('\n')
  let i = 0
  const headerRe = /^\s*\[([^\]]+)\]\s*$/
  while (i < lines.length) {
    if (lines[i].trim() === CODEX_MANAGED_MARKER) {
      i += 1
      continue
    }
    const match = lines[i].match(headerRe)
    if (match && codexSectionOwner(match[1].trim(), managed)) {
      i += 1
      while (i < lines.length) {
        const next = lines[i].match(headerRe)
        if (!next) {
          i += 1
          continue
        }
        if (codexSectionOwner(next[1].trim(), managed)) {
          i += 1
          continue
        }
        break
      }
      continue
    }
    kept.push(lines[i])
    i += 1
  }
  let text = kept.join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trimEnd()
  const blocks = [...managed].map(name => renderCodexBlock(name, generated[name]))
  if (text.length > 0) text += '\n\n'
  text += `${CODEX_MANAGED_MARKER}\n\n${blocks.join('\n\n')}\n`
  return text
}

function installCodex(): boolean {
  const mcpRead = readJsonSafe(fromRepo('./mcp/codex.json'))
  if (mcpRead.missing || mcpRead.corrupt) {
    console.error('  ✗ ./mcp/codex.json is missing or invalid. Run "bun run build" first.')
    return false
  }
  const codexPath = path.join(home, '.codex', 'config.toml')
  let current = ''
  try {
    current = fs.readFileSync(codexPath, 'utf-8')
  } catch {
    // Fresh machine, the managed block becomes the whole file.
  }
  const wanted = mergeCodexToml(current, mcpRead.data.mcp_servers ?? {})
  if (current === wanted) {
    console.log(`  = ${codexPath} (unchanged)`)
    return true
  }
  fs.mkdirSync(path.dirname(codexPath), { recursive: true })
  try {
    if (fs.lstatSync(codexPath).isSymbolicLink()) {
      fs.unlinkSync(codexPath)
      console.log(`  ↪ replaced symlink with regular file: ${codexPath}`)
    } else if (current !== '') {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      fs.copyFileSync(codexPath, `${codexPath}.bak-${stamp}`)
    }
  } catch {
    // No existing file, nothing to back up.
  }
  fs.writeFileSync(codexPath, wanted)
  console.log(`  ✓ ${codexPath}`)
  console.log('  → Restart Codex')
  return true
}

function installLmStudio(): boolean {
  const { lmstudio: lmstudioPath } = getTargets()
  const mcpRead = readJsonSafe(fromRepo('./mcp/lmstudio.json'))
  if (mcpRead.missing || mcpRead.corrupt) {
    console.error('  ✗ ./mcp/lmstudio.json is missing or invalid. Run "bun run build" first.')
    return false
  }
  const mcpConfig = mcpRead.data
  const read = readJsonSafe(lmstudioPath)
  if (read.corrupt) {
    console.error(`  ✗ ${lmstudioPath} is not valid JSON. Fix it manually, nothing was written.`)
    return false
  }
  const current = read.data

  current.mcpServers = mergeServers(current.mcpServers, mcpConfig.mcpServers ?? {})

  writeJson(lmstudioPath, current)
  console.log('  → Restart LM Studio')
  return true
}

// ── Installers (platform instructions) ───────────────────────────

// Copy a text file only when content differs. Identical destinations
// (including symlinks into this repo) are left untouched, symlinks are
// replaced by regular files, regular files are backed up first.
function installTextFile(src: string, dst: string) {
  if (!fs.existsSync(src)) {
    console.log(`  ⚠ ${src} not found`)
    return
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  const wanted = fs.readFileSync(src, 'utf-8')
  try {
    if (fs.readFileSync(dst, 'utf-8') === wanted) {
      console.log(`  = ${dst} (unchanged)`)
      return
    }
  } catch {
    // Destination does not exist yet, continue to copy.
  }
  try {
    if (fs.lstatSync(dst).isSymbolicLink()) {
      fs.unlinkSync(dst)
      console.log(`  ↪ replaced symlink with regular file: ${dst}`)
    } else {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      fs.copyFileSync(dst, `${dst}.bak-${stamp}`)
    }
  } catch {
    // No existing file, nothing to back up.
  }
  fs.copyFileSync(src, dst)
  console.log(`  ✓ ${dst}`)
}

function installClaudeInstructions() {
  const { claudeCodeDir } = getTargets()
  installTextFile('./scripts/instructions.md', path.join(claudeCodeDir, 'CLAUDE.md'))
}

function installOpenCodeInstructions() {
  const { opencodeDir } = getTargets()
  installTextFile('./scripts/instructions.md', path.join(opencodeDir, 'AGENTS.md'))
}

// ── Main ────────────────────────────────────────────────────────

const VALID_TARGETS = ['zed', 'claude', 'claudeCode', 'opencode', 'lmstudio', 'codex']

function main() {
  const args = process.argv.slice(2)
  const unknown = args.filter(a => !VALID_TARGETS.includes(a))
  if (unknown.length > 0) {
    console.error(`Unknown target(s): ${unknown.join(', ')}. Valid: ${VALID_TARGETS.join(', ')}`)
    process.exit(1)
  }
  const targets = new Set(args.length > 0 ? args : VALID_TARGETS)

  // First ensure configs are built
  if (!fs.existsSync(fromRepo('./mcp/zed.json'))) {
    console.error(
      'No built configs found. Run "bun run build" first.',
    )
    process.exit(1)
  }

  console.log('Installing MCP configs...\n')
  let ok = true

  if (targets.has('zed')) {
    console.log('Zed:')
    ok = installZed() && ok
    console.log()
  }
  if (targets.has('claude')) {
    console.log('Claude Desktop:')
    ok = installClaude() && ok
    console.log()
  }
  if (targets.has('claudeCode')) {
    console.log('Claude Code:')
    ok = installClaudeCode() && installClaudeCodeSettings() && ok
    console.log()
  }
  if (targets.has('opencode')) {
    console.log('OpenCode:')
    ok = installOpenCode() && ok
    console.log()
  }

  if (targets.has('lmstudio')) {
    console.log('LM Studio:')
    ok = installLmStudio() && ok
    console.log()
  }

  if (targets.has('codex')) {
    console.log('Codex CLI:')
    ok = installCodex() && ok
    console.log()
  }

  // ── Platform instructions ─────────────────────────────────────
  console.log('Platform instructions (~/.claude/CLAUDE.md, ~/.config/opencode/AGENTS.md):')
  installClaudeInstructions()
  installOpenCodeInstructions()
  console.log()

  if (!ok) {
    console.error('Some installs failed, see errors above.')
    process.exit(1)
  }
  console.log('Done!')
}

main()
