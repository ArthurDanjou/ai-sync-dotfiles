/**
 * Build all platform MCP config files from the single source of truth.
 *
 * Run:  bun run build
 *
 * Inspired by theme-artlab/scripts/index.ts
 */

import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { servers, serversForProfile } from '../servers'
import { getZedMcpConfig } from './zed'
import { getClaudeMcpConfig } from './claude'
import { getClaudeCodeMcpConfig } from './claude-code'
import { getCodexMcpConfig } from './codex'
import { getOpenCodeMcpConfig } from './opencode'
import { getLmStudioMcpConfig } from './lmstudio'

export async function main() {
  // Install profile: 'local' keeps every server, 'server' drops the
  // ones marked profiles: ['local'] (Mac binaries, Mac-local services).
  const profile = process.env.MCP_PROFILE || 'local'
  const active = serversForProfile(servers, profile)
  await fs.mkdir('./mcp', { recursive: true })

  await Promise.all([
    // ── Zed ──
    fs.writeFile(
      './mcp/zed.json',
      JSON.stringify(getZedMcpConfig(active), null, 2),
    ),

    // ── Claude Desktop ──
    fs.writeFile(
      './mcp/claude.json',
      JSON.stringify(getClaudeMcpConfig(active), null, 2),
    ),

    // ── Claude Code CLI ──
    fs.writeFile(
      './mcp/claude-code.json',
      JSON.stringify(getClaudeCodeMcpConfig(active), null, 2),
    ),

    // ── OpenCode ──
    fs.writeFile(
      './mcp/opencode.json',
      JSON.stringify(getOpenCodeMcpConfig(active), null, 2),
    ),

    // ── LM Studio ──
    fs.writeFile(
      './mcp/lmstudio.json',
      JSON.stringify(getLmStudioMcpConfig(active), null, 2),
    ),

    // ── Codex CLI ──
    fs.writeFile(
      './mcp/codex.json',
      JSON.stringify(getCodexMcpConfig(active), null, 2),
    ),

  ])

  // Log summary
  const stdioCount = active.filter(s => s.type === 'stdio').length
  const remoteCount = active.filter(s => s.type === 'remote').length
  const excluded = servers.length - active.length
  console.log(`✓ Generated MCP configs for Zed, Claude, Claude Code, OpenCode, Codex, and LM Studio`)
  console.log(`  profile ${profile}: ${stdioCount} stdio servers, ${remoteCount} remote servers${excluded > 0 ? `, ${excluded} excluded` : ''}`)
}

// Import-safe entrypoint, see setup/install.ts.
function isMain(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href
  } catch {
    return false
  }
}

if (isMain()) main().catch(console.error)
