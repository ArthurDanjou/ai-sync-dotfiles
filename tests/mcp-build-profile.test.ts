import { afterAll, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { main } from '../scripts/mcp/index'
import { makeTempDir } from './helpers'

// The outDir parameter keeps these builds away from the repo's ./mcp.
let dir: string

afterAll(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true })
})

// Section that carries the server keys in each generated config.
const SECTIONS: Array<[file: string, section: string]> = [
  ['zed.json', 'context_servers'],
  ['claude.json', 'mcpServers'],
  ['claude-code.json', 'mcpServers'],
  ['opencode.json', 'mcp'],
  ['lmstudio.json', 'mcpServers'],
  ['codex.json', 'mcp_servers'],
]

function keysFor(dir: string, [file, section]: [string, string]): string[] {
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
  return Object.keys(data[section] ?? {})
}

describe('profile builds (end to end)', () => {
  test('the server profile drops local-only servers from every platform', async () => {
    dir = makeTempDir('mcp-profile-server')
    await main('server', dir)
    for (const entry of SECTIONS) {
      const keys = keysFor(dir, entry)
      for (const local of ['zotero', 'oleafly', 'artnotes', 'artmusic', 'proxmox', 'filesystem']) {
        expect(keys, `${local} leaked into ${entry[0]}`).not.toContain(local)
      }
      expect(keys, `universal servers missing from ${entry[0]}`).toContain('github')
      // Zed only emits stdio servers, remote ones never appear there.
      if (entry[0] !== 'zed.json') {
        expect(keys, `remote servers missing from ${entry[0]}`).toContain('context7')
      }
    }
  })

  test('the local profile keeps every server', async () => {
    dir = makeTempDir('mcp-profile-local')
    await main('local', dir)
    for (const entry of SECTIONS) {
      const keys = keysFor(dir, entry)
      expect(keys, `zotero missing from ${entry[0]}`).toContain('zotero')
      expect(keys, `proxmox missing from ${entry[0]}`).toContain('proxmox')
    }
  })

  test('both profiles produce the same file set', async () => {
    const server = makeTempDir('mcp-profile-files-server')
    const local = makeTempDir('mcp-profile-files-local')
    await main('server', server)
    await main('local', local)
    expect(fs.readdirSync(server).sort()).toEqual(fs.readdirSync(local).sort())
  })
})
