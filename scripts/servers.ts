/**
 * Source of truth for all MCP servers.
 *
 * To add a new server, add an entry to the `servers` array below.
 * Then run `bun run build` to regenerate platform configs.
 *
 * Environment variables holding secrets are referenced via `process.env`
 * so they can be sourced from your shell or a .env file without being
 * hardcoded in the repository.
 */

export interface McpServerDefinition {
  /** Unique identifier for the server (used as the key in configs) */
  name: string
  /** Connection type */
  type: 'stdio' | 'remote'
  /**
   * For stdio: the main command (e.g. "bunx", "uvx", "npx", or a direct binary path).
   * For remote: not used.
   */
  command?: string
  /**
   * For stdio: arguments passed to the command.
   * For remote: not used.
   */
  args?: string[]
  /**
   * For remote: the SSE endpoint URL.
   * For stdio: not used.
   */
  url?: string
  /**
   * For remote: HTTP headers baked into configs that support them
   * (OpenCode, Claude Code). Dropped when every value is empty.
   * For stdio: not used.
   */
  headers?: Record<string, string>
  /**
   * For remote: runtime env var holding a bearer token (Codex only,
   * emitted as `bearer_token_env_var`). The variable must exist in the
   * process environment when Codex runs. Other platforms ignore it.
   */
  bearerTokenEnv?: string
  /**
   * Environment variables injected when launching the server.
   * Values are fallbacks; set the corresponding env var at runtime to override.
   */
  env?: Record<string, string>
  /** Whether the server is enabled by default (only meaningful for OpenCode) */
  enabled?: boolean
}

/**
 * The one and only list of MCP servers.
 * Edit this file, then run `bun run build` to regenerate everything.
 */
export const servers: McpServerDefinition[] = [
  // ───── stdio servers ─────

  {
    name: 'filesystem',
    type: 'stdio',
    command: 'bunx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '~/Workspace'],
    enabled: true,
  },
  {
    name: 'sequential-thinking',
    type: 'stdio',
    command: 'bunx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    enabled: true,
  },
  {
    name: 'fetch',
    type: 'stdio',
    command: 'uvx',
    args: ['mcp-server-fetch'],
    enabled: true,
  },
  {
    name: 'time',
    type: 'stdio',
    command: 'uvx',
    args: ['mcp-server-time'],
    enabled: true,
  },
  {
    name: 'firecrawl',
    type: 'stdio',
    command: 'bunx',
    args: ['-y', 'firecrawl-mcp'],
    env: {
      FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY ?? '',
    },
    enabled: false,
  },
  {
    name: 'github',
    type: 'stdio',
    command: 'bunx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN:
        process.env.GITHUB_PERSONAL_ACCESS_TOKEN ?? '',
    },
    enabled: true,
  },
  {
    name: 'arxiv',
    type: 'stdio',
    command: 'bunx',
    args: ['-y', '@fre4x/arxiv'],
    enabled: true,
  },
  {
    name: 'zotero',
    type: 'stdio',
    command: `${process.env.HOME ?? '~'}/.local/bin/zotero-mcp`,
    env: {
      ZOTERO_LOCAL: 'true',
      ZOTERO_API_KEY: process.env.ZOTERO_API_KEY ?? '',
      ZOTERO_LIBRARY_ID: process.env.ZOTERO_LIBRARY_ID ?? '0',
    },
    enabled: true,
  },
  {
    name: 'karakeep',
    type: 'stdio',
    command: 'bunx',
    args: ['-y', '@karakeep/mcp'],
    env: {
      KARAKEEP_API_ADDR: process.env.KARAKEEP_API_URL ?? '',
      KARAKEEP_API_KEY: process.env.KARAKEEP_API_KEY ?? '',
    },
    enabled: true,
  },
  {
    name: 'obsidian',
    type: 'stdio',
    command: 'uvx',
    args: ['mcp-obsidian'],
    env: {
      OBSIDIAN_API_KEY: process.env.OBSIDIAN_API_KEY ?? '',
      OBSIDIAN_HOST: process.env.OBSIDIAN_HOST ?? '',
      OBSIDIAN_PORT: process.env.OBSIDIAN_PORT ?? '',
    },
    enabled: true,
  },
  {
    name: 'proxmox',
    type: 'stdio',
    command: 'bunx',
    args: ['-y', '@bldg-7/proxmox-mcp'],
    env: {
      PROXMOX_HOST: process.env.PROXMOX_HOST ?? '',
      PROXMOX_PORT: process.env.PROXMOX_PORT ?? '',
      PROXMOX_USER: process.env.PROXMOX_USER ?? '',
      PROXMOX_TOKEN_NAME: process.env.PROXMOX_TOKEN_NAME ?? '',
      PROXMOX_TOKEN_VALUE: process.env.PROXMOX_TOKEN_VALUE ?? '',
      PROXMOX_SSL_MODE: process.env.PROXMOX_SSL_MODE ?? '',
    },
    enabled: true,
  },

  {
    name: 'music-assistant',
    type: 'stdio',
    command: 'uvx',
    args: [
      '--from',
      'git+https://github.com/davidpadbury/music-assistant-mcp',
      '--with',
      'mcp[cli]<2',
      'music-assistant-mcp',
    ],
    env: {
      MUSIC_ASSISTANT_URL: process.env.MUSIC_ASSISTANT_URL ?? '',
      MUSIC_ASSISTANT_TOKEN: process.env.MUSIC_ASSISTANT_TOKEN ?? '',
    },
    enabled: true,
  },

  // ───── remote (SSE) servers ─────

  {
    name: 'context7',
    type: 'remote',
    url: 'https://mcp.context7.com/mcp',
    enabled: true,
  },
  {
    name: 'grep_app',
    type: 'remote',
    url: 'https://mcp.grep.app',
    enabled: true,
  },
  {
    name: 'arthome',
    type: 'remote',
    url: process.env.ARTHOME_MCP_URL ?? '',
    enabled: true,
  },
  {
    name: 'cloudflare-docs',
    type: 'remote',
    url: 'https://docs.mcp.cloudflare.com/mcp',
    enabled: false,
  },
]
