import { describe, expect, test } from 'bun:test'
import { servers, serversForProfile } from '../scripts/servers'
import { getZedMcpConfig } from '../scripts/mcp/zed'
import { getClaudeMcpConfig } from '../scripts/mcp/claude'
import { getClaudeCodeMcpConfig } from '../scripts/mcp/claude-code'
import { getCodexMcpConfig } from '../scripts/mcp/codex'
import { getOpenCodeMcpConfig } from '../scripts/mcp/opencode'
import { getLmStudioMcpConfig } from '../scripts/mcp/lmstudio'

describe('servers source of truth', () => {
  test('names are unique and non-empty', () => {
    const names = servers.map(s => s.name)
    expect(names.length).toBeGreaterThan(0)
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) expect(name.trim().length).toBeGreaterThan(0)
  })

  test('every stdio server has a command, every remote server has a url key', () => {
    for (const server of servers) {
      if (server.type === 'stdio') {
        expect(server.command, `${server.name} needs a command`).toBeTruthy()
      } else {
        expect('url' in server, `${server.name} needs a url`).toBe(true)
      }
    }
  })

  test('env values are plain strings so configs stay serializable', () => {
    for (const server of servers) {
      for (const value of Object.values(server.env ?? {})) {
        expect(typeof value).toBe('string')
      }
    }
  })

  test('every platform generator accepts the real list without crashing', () => {
    expect(() => getZedMcpConfig(servers)).not.toThrow()
    expect(() => getClaudeMcpConfig(servers)).not.toThrow()
    expect(() => getClaudeCodeMcpConfig(servers)).not.toThrow()
    expect(() => getCodexMcpConfig(servers)).not.toThrow()
    expect(() => getOpenCodeMcpConfig(servers)).not.toThrow()
    expect(() => getLmStudioMcpConfig(servers)).not.toThrow()
  })

  test('the local profile keeps every server', () => {
    expect(serversForProfile(servers, 'local')).toHaveLength(servers.length)
  })

  test('the server profile drops Mac-only servers and keeps the rest', () => {
    const remote = serversForProfile(servers, 'server')
    const remoteNames = new Set(remote.map(s => s.name))
    // Mac binaries and Mac-local services never ship to a server.
    for (const name of ['zotero', 'oleafly', 'artnotes', 'artmusic']) {
      expect(remoteNames.has(name), `${name} should be local-only`).toBe(false)
      expect(servers.find(s => s.name === name)?.profiles).toEqual(['local'])
    }
    // Untagged servers ship everywhere.
    expect(remoteNames.has('github')).toBe(true)
    expect(remoteNames.has('context7')).toBe(true)
  })

  test('generated keys are always a subset of declared server names', () => {
    const names = new Set(servers.map(s => s.name))
    const outputs = [
      Object.keys(getZedMcpConfig(servers).context_servers),
      Object.keys(getClaudeMcpConfig(servers).mcpServers),
      Object.keys(getClaudeCodeMcpConfig(servers).mcpServers),
      Object.keys(getCodexMcpConfig(servers).mcp_servers),
      Object.keys(getOpenCodeMcpConfig(servers).mcp),
      Object.keys(getLmStudioMcpConfig(servers).mcpServers),
    ]
    for (const keys of outputs) {
      expect(keys.length).toBeGreaterThan(0)
      for (const key of keys) expect(names.has(key)).toBe(true)
    }
  })
})
