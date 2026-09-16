/**
 * Build the `mcpServers` object for Claude Desktop config.
 *
 * File location:
 *   ~/Library/Application Support/Claude Desktop/claude_desktop_config.json
 *
 * Format:
 *   {
 *     "mcpServers": {
 *       "server-name": {
 *         "command": "uvx",
 *         "args": ["pkg"],
 *         "env": { ... }
 *       }
 *     }
 *   }
 */

import type { McpServerDefinition } from './servers'
import { filterEnv, splitCommand } from './helper'

export interface ClaudeMcpConfig {
  mcpServers: Record<string, ClaudeMcpServer>
}

// Claude Desktop supports both stdio and remote servers
export type ClaudeMcpServer =
  | { command: string; args?: string[]; env?: Record<string, string> }
  | { url: string }

export function getClaudeMcpConfig(
  servers: McpServerDefinition[],
): ClaudeMcpConfig {
  const mcpServers: Record<string, ClaudeMcpServer> = {}

  for (const server of servers) {
    if (server.type === 'remote' && server.url) {
      mcpServers[server.name] = { url: server.url }
    } else if (server.type === 'stdio' && server.command) {
      const { command, args } = splitCommand(server)
      const entry: { command: string; args?: string[]; env?: Record<string, string> } = { command }
      if (args.length > 0) entry.args = args
      const env = filterEnv(server.env)
      if (env) entry.env = env
      mcpServers[server.name] = entry
    }
  }

  return { mcpServers }
}
