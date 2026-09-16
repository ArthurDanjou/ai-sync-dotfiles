import { describe, expect, test } from 'bun:test'
import { filterEnv, getStdioServers, splitCommand } from '../scripts/mcp/helper'
import type { McpServerDefinition } from '../scripts/servers'

const stdio: McpServerDefinition = {
  name: 'demo',
  type: 'stdio',
  command: 'bunx',
  args: ['-y', 'demo-pkg'],
  env: { TOKEN: 'abc' },
}

describe('getStdioServers', () => {
  test('keeps stdio servers and drops remote ones', () => {
    const remote: McpServerDefinition = { name: 'r', type: 'remote', url: 'https://x' }
    expect(getStdioServers([stdio, remote])).toEqual([stdio])
  })
})

describe('splitCommand', () => {
  test('splits command and args', () => {
    expect(splitCommand(stdio)).toEqual({ command: 'bunx', args: ['-y', 'demo-pkg'] })
  })

  test('defaults missing args to an empty array', () => {
    expect(splitCommand({ name: 'x', type: 'stdio', command: 'uvx' })).toEqual({
      command: 'uvx',
      args: [],
    })
  })

  test('defaults a missing command to an empty string', () => {
    expect(splitCommand({ name: 'x', type: 'stdio' })).toEqual({ command: '', args: [] })
  })
})

describe('filterEnv', () => {
  test('drops empty values that mean unset secrets', () => {
    expect(filterEnv({ A: 'x', B: '' })).toEqual({ A: 'x' })
  })

  test('returns undefined when nothing is set', () => {
    expect(filterEnv({ A: '' })).toBeUndefined()
    expect(filterEnv({})).toBeUndefined()
    expect(filterEnv(undefined)).toBeUndefined()
  })

  test('keeps every value when all are set', () => {
    expect(filterEnv({ A: 'x', B: 'y' })).toEqual({ A: 'x', B: 'y' })
  })
})
