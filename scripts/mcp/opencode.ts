/**
 * Build the `mcp` object for OpenCode's config.
 *
 * File location:
 *   ~/.config/opencode/opencode.jsonc  (or ~/.opencode.json)
 *
 * Format:
 *   "mcp": {
 *     "server-name": {
 *       "type": "local",
 *       "command": ["bunx", "-y", "pkg"],
 *       "environment": { ... },
 *       "enabled": true
 *     }
 *   }
 *
 * Remote servers:
 *   "server-name": {
 *     "type": "remote",
 *     "url": "https://...",
 *     "enabled": true
 *   }
 */

import type { McpServerDefinition } from '../servers'
import { filterEnv } from './helper'

export interface OpenCodeMcpConfig {
  mcp: Record<string, OpenCodeMcpServer>
}

export interface OpenCodeMcpServerLocal {
  type: 'local'
  command: string[]
  environment?: Record<string, string>
  enabled?: boolean
}

export interface OpenCodeMcpServerRemote {
  type: 'remote'
  url: string
  headers?: Record<string, string>
  enabled?: boolean
}

export type OpenCodeMcpServer = OpenCodeMcpServerLocal | OpenCodeMcpServerRemote

export function getOpenCodeMcpConfig(
  servers: McpServerDefinition[],
): OpenCodeMcpConfig {
  const mcp: Record<string, OpenCodeMcpServer> = {}

  for (const server of servers) {
    if (server.type === 'remote' && server.url) {
      mcp[server.name] = {
        type: 'remote',
        url: server.url,
        enabled: server.enabled ?? true,
      }
      const headers = filterEnv(server.headers)
      if (headers) (mcp[server.name] as OpenCodeMcpServerRemote).headers = headers
    } else if (server.type === 'stdio' && server.command) {
      const entry: OpenCodeMcpServerLocal = {
        type: 'local',
        command: server.args?.length
          ? [server.command, ...server.args]
          : [server.command],
        enabled: server.enabled ?? true,
      }
      const environment = filterEnv(server.env)
      if (environment) entry.environment = environment
      mcp[server.name] = entry
    }
  }

  return { mcp }
}
