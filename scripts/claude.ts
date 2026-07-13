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
import { filterEnv, getStdioServers, splitCommand } from './helper'

export interface ClaudeMcpConfig {
  mcpServers: Record<string, ClaudeMcpServer>
}

export interface ClaudeMcpServer {
  command: string
  args?: string[]
  env?: Record<string, string>
}

export function getClaudeMcpConfig(
  servers: McpServerDefinition[],
): ClaudeMcpConfig {
  const mcpServers: Record<string, ClaudeMcpServer> = {}

  for (const server of getStdioServers(servers)) {
    if (!server.command) continue

    const { command, args } = splitCommand(server)

    const entry: ClaudeMcpServer = { command }
    if (args.length > 0) entry.args = args
    const env = filterEnv(server.env)
    if (env) entry.env = env

    mcpServers[server.name] = entry
  }

  return { mcpServers }
}
