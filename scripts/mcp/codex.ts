/**
 * Build the `mcp_servers` object for Codex CLI config.
 *
 * Stored in ~/.codex/config.toml as `[mcp_servers.<name>]` tables.
 * Shape verified against `codex mcp add` output (codex-cli 0.154.0):
 *   stdio:  [mcp_servers.name] with command/args, env in [mcp_servers.name.env]
 *   remote: [mcp_servers.name] with url (streamable HTTP)
 *
 * The object is serialized to ./mcp/codex.json at build time, then merged
 * as TOML text into the live config.toml at install time.
 */

import type { McpServerDefinition } from '../servers'
import { filterEnv, splitCommand } from './helper'

export interface CodexMcpConfig {
  mcp_servers: Record<string, CodexMcpServer>
}

export type CodexMcpServer =
  | CodexMcpStdioServer
  | CodexMcpRemoteServer

export interface CodexMcpStdioServer {
  command: string
  args?: string[]
  env?: Record<string, string>
}

export interface CodexMcpRemoteServer {
  url: string
  bearer_token_env_var?: string
}

export function getCodexMcpConfig(
  servers: McpServerDefinition[],
): CodexMcpConfig {
  const mcp_servers: Record<string, CodexMcpServer> = {}

  for (const server of servers) {
    if (server.type === 'remote' && server.url) {
      const entry: CodexMcpRemoteServer = {
        url: server.url,
      }
      if (server.bearerTokenEnv) entry.bearer_token_env_var = server.bearerTokenEnv
      mcp_servers[server.name] = entry
    } else if (server.type === 'stdio' && server.command) {
      const { command, args } = splitCommand(server)
      const entry: CodexMcpStdioServer = { command }
      if (args.length > 0) entry.args = args
      const env = filterEnv(server.env)
      if (env) entry.env = env
      mcp_servers[server.name] = entry
    }
  }

  return { mcp_servers }
}
