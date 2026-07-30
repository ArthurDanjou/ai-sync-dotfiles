/**
 * Install MCP configs to their platform-specific system locations.
 *
 * Usage:
 *   bun run install           # installs to all platforms
 *   bun run install:zed       # installs only Zed
 *   bun run install:claude    # installs only Claude Desktop
 *   bun run install:claude-code # installs only Claude Code CLI
 *   bun run install:opencode  # installs only OpenCode
 *
 * Inspired by theme-artlab/scripts/install.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const home = process.env.HOME || process.env.USERPROFILE || ''

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
    lmstudioDir: path.join(home, '.lmstudio'),
  }
}

// ── Helpers ─────────────────────────────────────────────────────

/** Strip trailing commas so JSONC can be parsed as JSON. */
function stripTrailingCommas(text: string): string {
  return text.replace(/,([\s\n]*[}\]])/g, '$1')
}

function readJson(filePath: string): any {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(stripTrailingCommas(raw))
  } catch {
    return {}
  }
}

function writeJson(filePath: string, data: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  // Write back as .jsonc (keep the extension)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
  console.log(`  ✓ ${filePath}`)
}

// ── Installers (MCP configs) ────────────────────────────────────

function installZed() {
  const { zed: zedPath } = getTargets()
  const mcpConfig = readJson('./mcp/zed.json')
  let current: Record<string, unknown>

  try {
    const raw = fs.readFileSync(zedPath, 'utf-8')
    current = JSON.parse(stripTrailingCommas(raw))
  } catch {
    // File doesn't exist yet — start fresh
    current = {}
  }

  // Merge only the context_servers key into the existing settings
  current.context_servers = mcpConfig.context_servers

  writeJson(zedPath, current)
  console.log('  → Restart Zed (or run "zed: reload settings")')
}

function installClaude() {
  const { claude: claudePath } = getTargets()
  const mcpConfig = readJson('./mcp/claude.json')
  const current = readJson(claudePath)

  // Replace mcpServers in the config
  current.mcpServers = mcpConfig.mcpServers

  writeJson(claudePath, current)
  console.log('  → Restart Claude Desktop')
}

function installClaudeCode() {
  const { claudeCode: claudeCodePath } = getTargets()
  const mcpConfig = readJson('./mcp/claude-code.json')

  const current = readJson(claudeCodePath)
  const projectPath = process.cwd()

  // Ensure the project entry exists
  if (!current.projects) current.projects = {}
  if (!current.projects[projectPath]) current.projects[projectPath] = {}

  // Set mcpServers under the current project
  current.projects[projectPath].mcpServers = mcpConfig.mcpServers

  writeJson(claudeCodePath, current)
  console.log(`  → Restart Claude Code (or reload with Ctrl+R)`)
}

function installOpenCode() {
  const { opencode: opencodePath } = getTargets()
  const mcpConfig = readJson('./mcp/opencode.json')

  // OpenCode config is JSONC (may have comments). We read/write as plain JSON
  // to avoid stripping comments. For full JSONC preservation, manually merge.
  const current = readJson(opencodePath)

  // Replace the entire mcp section
  current.mcp = mcpConfig.mcp

  writeJson(opencodePath, current)
  console.log('  → Restart OpenCode')
}

function installLmStudio() {
  const { lmstudio: lmstudioPath, lmstudioDir } = getTargets()
  const mcpConfig = readJson('./mcp/lmstudio.json')
  const current = readJson(lmstudioPath)

  current.mcpServers = mcpConfig.mcpServers

  writeJson(lmstudioPath, current)
  console.log('  → Restart LM Studio')
}

// ── Installers (platform instructions) ───────────────────────────

function installClaudeInstructions() {
  const { claudeCodeDir } = getTargets()
  const src = './scripts/instructions.md'
  const dst = path.join(claudeCodeDir, 'CLAUDE.md')

  if (!fs.existsSync(src)) {
    console.log('  ⚠ scripts/instructions.md not found')
    return
  }

  fs.mkdirSync(claudeCodeDir, { recursive: true })
  fs.copyFileSync(src, dst)
  console.log(`  ✓ ${dst}`)
}

function installOpenCodeInstructions() {
  const { opencodeDir } = getTargets()
  const src = './scripts/instructions.md'
  const dst = path.join(opencodeDir, 'AGENTS.md')

  if (!fs.existsSync(src)) {
    console.log('  ⚠ scripts/instructions.md not found')
    return
  }

  fs.mkdirSync(opencodeDir, { recursive: true })
  fs.copyFileSync(src, dst)
  console.log(`  ✓ ${dst}`)
}

// ── Main ────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)
  const targets = new Set(args.length > 0 ? args : ['zed', 'claude', 'claudeCode', 'opencode', 'lmstudio'])

  // First ensure configs are built
  if (!fs.existsSync('./mcp/zed.json')) {
    console.error(
      'No built configs found. Run "bun run build" first.',
    )
    process.exit(1)
  }

  console.log('Installing MCP configs...\n')

  if (targets.has('zed')) {
    console.log('Zed:')
    installZed()
    console.log()
  }
  if (targets.has('claude')) {
    console.log('Claude Desktop:')
    installClaude()
    console.log()
  }
  if (targets.has('claudeCode')) {
    console.log('Claude Code:')
    installClaudeCode()
    console.log()
  }
  if (targets.has('opencode')) {
    console.log('OpenCode:')
    installOpenCode()
    console.log()
  }

  if (targets.has('lmstudio')) {
    console.log('LM Studio:')
    installLmStudio()
    console.log()
  }

  // ── Platform instructions ─────────────────────────────────────
  console.log('Platform instructions (~/.claude/CLAUDE.md, ~/.config/opencode/AGENTS.md):')
  installClaudeInstructions()
  installOpenCodeInstructions()
  console.log()

  console.log('Done!')
}

main()
