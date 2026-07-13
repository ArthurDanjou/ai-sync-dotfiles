/**
 * Build all platform MCP config files from the single source of truth.
 *
 * Run:  bun run build
 *
 * Inspired by theme-artlab/scripts/index.ts
 */

import 'dotenv/config'
import fs from 'node:fs/promises'
import { servers } from './servers'
import { getZedMcpConfig } from './zed'
import { getClaudeMcpConfig } from './claude'
import { getOpenCodeMcpConfig } from './opencode'

async function main() {
  await fs.mkdir('./mcp', { recursive: true })

  await Promise.all([
    // ── Zed ──
    fs.writeFile(
      './mcp/zed.json',
      JSON.stringify(getZedMcpConfig(servers), null, 2),
    ),

    // ── Claude Desktop ──
    fs.writeFile(
      './mcp/claude.json',
      JSON.stringify(getClaudeMcpConfig(servers), null, 2),
    ),

    // ── OpenCode ──
    fs.writeFile(
      './mcp/opencode.json',
      JSON.stringify(getOpenCodeMcpConfig(servers), null, 2),
    ),
  ])

  // Log summary
  const stdioCount = servers.filter(s => s.type === 'stdio').length
  const remoteCount = servers.filter(s => s.type === 'remote').length
  console.log(`✓ Generated MCP configs for Zed, Claude, and OpenCode`)
  console.log(`  ${stdioCount} stdio servers, ${remoteCount} remote servers`)
}

main().catch(console.error)
