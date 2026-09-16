/**
 * Build the `mcpServers` object for LM Studio config.
 *
 * File location:
 *   ~/.lmstudio/mcp.json
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
 *
 * Remote servers:
 *   "server-name": {
 *     "url": "https://..."
 *   }
 */

import type { McpServerDefinition } from '../servers'
import { filterEnv, splitCommand } from './helper'

export interface LmStudioMcpConfig {
  mcpServers: Record<string, LmStudioMcpServer>
}

export type LmStudioMcpServer =
  | { command: string; args?: string[]; env?: Record<string, string> }
  | { url: string }

export function getLmStudioMcpConfig(
  servers: McpServerDefinition[],
): LmStudioMcpConfig {
  const mcpServers: Record<string, LmStudioMcpServer> = {}

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
