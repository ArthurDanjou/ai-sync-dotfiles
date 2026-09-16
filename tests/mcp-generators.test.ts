import { describe, expect, test } from 'bun:test'
import { getZedMcpConfig } from '../scripts/mcp/zed'
import { getClaudeMcpConfig } from '../scripts/mcp/claude'
import { getClaudeCodeMcpConfig } from '../scripts/mcp/claude-code'
import { getCodexMcpConfig } from '../scripts/mcp/codex'
import { getOpenCodeMcpConfig } from '../scripts/mcp/opencode'
import { getLmStudioMcpConfig } from '../scripts/mcp/lmstudio'
import type { McpServerDefinition } from '../scripts/servers'

const stdioFull: McpServerDefinition = {
  name: 'full',
  type: 'stdio',
  command: 'bunx',
  args: ['-y', 'pkg'],
  env: { TOKEN: 'secret' },
  enabled: true,
}

const stdioMinimal: McpServerDefinition = {
  name: 'minimal',
  type: 'stdio',
  command: 'uvx',
}

const remoteFull: McpServerDefinition = {
  name: 'web',
  type: 'remote',
  url: 'https://example.com/mcp',
  headers: { Authorization: 'Bearer x' },
  bearerTokenEnv: 'WEB_TOKEN',
  enabled: false,
}

const remoteEmptyUrl: McpServerDefinition = { name: 'empty', type: 'remote', url: '' }
const stdioNoCommand: McpServerDefinition = { name: 'broken', type: 'stdio' }

const mixed = [stdioFull, stdioMinimal, remoteFull, remoteEmptyUrl, stdioNoCommand]

describe('zed (stdio only)', () => {
  test('emits context_servers with stdio servers only', () => {
    const config = getZedMcpConfig(mixed)
    expect(Object.keys(config.context_servers).sort()).toEqual(['full', 'minimal'])
    expect(config.context_servers.full).toEqual({
      command: 'bunx',
      args: ['-y', 'pkg'],
      env: { TOKEN: 'secret' },
    })
  })

  test('omits args and env when unset', () => {
    const config = getZedMcpConfig([stdioMinimal])
    expect(config.context_servers.minimal).toEqual({ command: 'uvx' })
  })
})

describe('claude desktop (stdio + remote url)', () => {
  test('emits mcpServers for both transports, skipping empty urls', () => {
    const config = getClaudeMcpConfig(mixed)
    expect(Object.keys(config.mcpServers).sort()).toEqual(['full', 'minimal', 'web'])
    expect(config.mcpServers.web).toEqual({ url: 'https://example.com/mcp' })
  })
})

describe('claude code (remote typed http with headers)', () => {
  test('tags remote servers and keeps headers', () => {
    const config = getClaudeCodeMcpConfig(mixed)
    expect(config.mcpServers.web).toEqual({
      type: 'http',
      url: 'https://example.com/mcp',
      headers: { Authorization: 'Bearer x' },
    })
    expect(config.mcpServers.full).toEqual({
      command: 'bunx',
      args: ['-y', 'pkg'],
      env: { TOKEN: 'secret' },
    })
  })
})

describe('codex (bearer token env var on remote)', () => {
  test('maps bearerTokenEnv and keeps env blocks on stdio', () => {
    const config = getCodexMcpConfig(mixed)
    expect(config.mcp_servers.web).toEqual({
      url: 'https://example.com/mcp',
      bearer_token_env_var: 'WEB_TOKEN',
    })
    expect(config.mcp_servers.full).toEqual({
      command: 'bunx',
      args: ['-y', 'pkg'],
      env: { TOKEN: 'secret' },
    })
  })
})

describe('opencode (local command array, enabled flag)', () => {
  test('flattens stdio into a command array with environment', () => {
    const config = getOpenCodeMcpConfig(mixed)
    expect(config.mcp.full).toEqual({
      type: 'local',
      command: ['bunx', '-y', 'pkg'],
      environment: { TOKEN: 'secret' },
      enabled: true,
    })
    expect(config.mcp.minimal).toEqual({
      type: 'local',
      command: ['uvx'],
      enabled: true,
    })
    expect(config.mcp.web).toEqual({
      type: 'remote',
      url: 'https://example.com/mcp',
      headers: { Authorization: 'Bearer x' },
      enabled: false,
    })
  })
})

describe('lmstudio (stdio + remote url)', () => {
  test('mirrors the claude desktop shape', () => {
    const config = getLmStudioMcpConfig(mixed)
    expect(Object.keys(config.mcpServers).sort()).toEqual(['full', 'minimal', 'web'])
    expect(config.mcpServers.web).toEqual({ url: 'https://example.com/mcp' })
  })
})

describe('all generators', () => {
  test('outputs survive a JSON round trip', () => {
    const outputs = [
      getZedMcpConfig(mixed),
      getClaudeMcpConfig(mixed),
      getClaudeCodeMcpConfig(mixed),
      getCodexMcpConfig(mixed),
      getOpenCodeMcpConfig(mixed),
      getLmStudioMcpConfig(mixed),
    ]
    for (const output of outputs) {
      expect(JSON.parse(JSON.stringify(output))).toEqual(output)
    }
  })
})
