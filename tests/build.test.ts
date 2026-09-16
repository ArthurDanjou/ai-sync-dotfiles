import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { repoPath, repoRoot } from './helpers'

const expectedKeys: Record<string, string> = {
  'zed.json': 'context_servers',
  'claude.json': 'mcpServers',
  'claude-code.json': 'mcpServers',
  'opencode.json': 'mcp',
  'codex.json': 'mcp_servers',
  'lmstudio.json': 'mcpServers',
}

describe('bun run build', () => {
  test('regenerates every platform config as valid JSON', () => {
    execFileSync('bun', ['run', 'build'], { cwd: repoRoot, stdio: 'pipe' })
    for (const [file, key] of Object.entries(expectedKeys)) {
      const raw = fs.readFileSync(repoPath('mcp', file), 'utf-8')
      const parsed = JSON.parse(raw)
      expect(Object.keys(parsed), `${file} needs a ${key} key`).toContain(key)
    }
  }, 60_000)
})
