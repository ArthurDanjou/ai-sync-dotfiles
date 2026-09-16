import { describe, expect, test } from 'bun:test'
import {
  CODEX_MANAGED_MARKER,
  codexSectionOwner,
  deepEqual,
  mergeCodexToml,
  mergeServers,
  renderCodexBlock,
  stripJsonc,
  tomlString,
} from '../scripts/setup/install'

describe('stripJsonc', () => {
  test('removes line and block comments', () => {
    const parsed = JSON.parse(stripJsonc('{ // hello\n"a": 1, /* world */ "b": 2 }'))
    expect(parsed).toEqual({ a: 1, b: 2 })
  })

  test('removes trailing commas', () => {
    expect(JSON.parse(stripJsonc('{"a": [1, 2,],}'))).toEqual({ a: [1, 2] })
  })

  test('keeps comment markers inside strings', () => {
    expect(JSON.parse(stripJsonc('{"a": "x // y /* z */"}'))).toEqual({ a: 'x // y /* z */' })
  })
})

describe('deepEqual', () => {
  test('compares objects without regard to key order', () => {
    expect(deepEqual({ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1 })).toBe(true)
  })

  test('distinguishes values, arrays and shapes', () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqual([1, 2], [2, 1])).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(deepEqual(null, {})).toBe(false)
  })
})

describe('mergeServers', () => {
  test('generated entries win, local extras survive', () => {
    expect(mergeServers({ keep: 1, over: 'old' }, { over: 'new' })).toEqual({
      keep: 1,
      over: 'new',
    })
  })
})

describe('codex toml helpers', () => {
  test('tomlString quotes values', () => {
    expect(tomlString('a"b')).toBe('"a\\"b"')
  })

  test('renderCodexBlock renders stdio and remote servers', () => {
    expect(renderCodexBlock('s', { command: 'bunx', args: ['-y', 'p'], env: { K: 'v' } }))
      .toBe('[mcp_servers.s]\ncommand = "bunx"\nargs = ["-y", "p"]\n\n[mcp_servers.s.env]\nK = "v"')
    expect(renderCodexBlock('r', { url: 'https://x', bearer_token_env_var: 'T' }))
      .toBe('[mcp_servers.r]\nurl = "https://x"\nbearer_token_env_var = "T"')
  })

  test('codexSectionOwner maps headers to managed base names', () => {
    const managed = new Set(['a'])
    expect(codexSectionOwner('mcp_servers.a', managed)).toBe('a')
    expect(codexSectionOwner('mcp_servers.a.env', managed)).toBe('a')
    expect(codexSectionOwner('mcp_servers.b', managed)).toBeNull()
    expect(codexSectionOwner('other.a', managed)).toBeNull()
  })

  test('mergeCodexToml replaces managed blocks and preserves the rest', () => {
    const generated = { a: { command: 'new' } }
    const current = [
      'top = true',
      '',
      '[mcp_servers.custom]',
      'command = "keep"',
      '',
      '[mcp_servers.a]',
      'command = "old"',
    ].join('\n')
    const merged = mergeCodexToml(current, generated)
    expect(merged).toContain('[mcp_servers.custom]\ncommand = "keep"')
    expect(merged).toContain('command = "new"')
    expect(merged).not.toContain('"old"')
    expect(merged).toContain(CODEX_MANAGED_MARKER)
  })

  test('mergeCodexToml is idempotent', () => {
    const generated = { a: { command: 'x', args: ['y'] } }
    const once = mergeCodexToml('', generated)
    expect(mergeCodexToml(once, generated)).toBe(once)
  })
})
