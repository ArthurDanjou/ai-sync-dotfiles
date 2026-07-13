/**
 * Build the `context_servers` object for inclusion in Zed's settings.json.
 *
 * Format:
 *   "context_servers": {
 *     "server-name": {
 *       "command": "bunx",
 *       "args": ["-y", "pkg"],
 *       "env": { ... }
 *     }
 *   }
 */

import type { McpServerDefinition } from './servers'
import { filterEnv, getStdioServers, splitCommand } from './helper'

export interface ZedMcpConfig {
  context_servers: Record<string, ZedMcpServer>
}

export interface ZedMcpServer {
  command: string
  args?: string[]
  env?: Record<string, string>
}

export function getZedMcpConfig(servers: McpServerDefinition[]): ZedMcpConfig {
  const context_servers: Record<string, ZedMcpServer> = {}

  for (const server of getStdioServers(servers)) {
    if (!server.command) continue

    const { command, args } = splitCommand(server)

    const entry: ZedMcpServer = { command }
    if (args.length > 0) entry.args = args
    const env = filterEnv(server.env)
    if (env) entry.env = env

    context_servers[server.name] = entry
  }

  return { context_servers }
}
