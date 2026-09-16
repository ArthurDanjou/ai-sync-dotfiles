/**
 * Shared helpers for MCP config generation.
 * Mirrors the pattern from theme-artlab/scripts/helper.ts
 */

import type { McpServerDefinition } from '../servers'

/**
 * Filter servers that are appropriate for a given platform.
 * Returns all stdio servers (Zed only supports stdio).
 */
export function getStdioServers(servers: McpServerDefinition[]) {
  return servers.filter(s => s.type === 'stdio')
}

/**
 * Separate a command + args array into the standard { command, args } shape
 * that Zed and Claude Desktop expect.
 *
 * OpenCode uses a flat array for the command, but Zed/Claude want:
 *   { "command": "bunx", "args": ["-y", "pkg"] }
 */
export function splitCommand(input: McpServerDefinition): {
  command: string
  args: string[]
} {
  const { command, args = [] } = input
  return { command: command ?? '', args }
}

/**
 * Filter out environment variables with empty string values.
 * Keeps the config clean when a secret isn't set at build time.
 */
export function filterEnv(env?: Record<string, string>): Record<string, string> | undefined {
  if (!env) return undefined
  const filtered = Object.fromEntries(
    Object.entries(env).filter(([, v]) => v !== ''),
  )
  return Object.keys(filtered).length > 0 ? filtered : undefined
}
