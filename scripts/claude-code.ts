/**
 * Build the `mcpServers` object for Claude Code CLI config.
 *
 * Stored in ~/.claude.json under projects["<cwd>"].mcpServers
 *
 * Format:
 *   stdio:   { "command": "uvx", "args": ["pkg"], "env": { ... } }
 *   remote:  { "type": "http", "url": "https://..." }
 */

import type { McpServerDefinition } from './servers'
import { filterEnv, splitCommand } from './helper'

// ── Types ──────────────────────────────────────────────────────

export interface ClaudeCodeMcpConfig {
  mcpServers: Record<string, ClaudeCodeMcpServer>
}

export type ClaudeCodeMcpServer =
  | ClaudeCodeMcpStdioServer
  | ClaudeCodeMcpRemoteServer

export interface ClaudeCodeMcpStdioServer {
  command: string
  args?: string[]
  env?: Record<string, string>
}

export interface ClaudeCodeMcpRemoteServer {
  type: 'http'
  url: string
}

// ── Generator ──────────────────────────────────────────────────

export function getClaudeCodeMcpConfig(
  servers: McpServerDefinition[],
): ClaudeCodeMcpConfig {
  const mcpServers: Record<string, ClaudeCodeMcpServer> = {}

  for (const server of servers) {
    if (server.type === 'remote' && server.url) {
      mcpServers[server.name] = {
        type: 'http',
        url: server.url,
      }
    } else if (server.type === 'stdio' && server.command) {
      const { command, args } = splitCommand(server)
      const entry: ClaudeCodeMcpStdioServer = { command }
      if (args.length > 0) entry.args = args
      const env = filterEnv(server.env)
      if (env) entry.env = env
      mcpServers[server.name] = entry
    }
  }

  return { mcpServers }
}
