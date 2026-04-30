import { homedir } from "node:os"
import { join } from "node:path"

export interface DirResolverEnv {
  platform: NodeJS.Platform
  env: NodeJS.ProcessEnv
  home: string
}

function defaults(): DirResolverEnv {
  return { platform: process.platform, env: process.env, home: homedir() }
}

// macOS deliberately uses ~/.config/<app> rather than honoring XDG_CONFIG_HOME
// (which would redirect to ~/Library/Application Support). This matches where
// auth tokens have always been stored on macOS.
export function resolveConfigDir(deps: DirResolverEnv): string {
  if (deps.platform === "darwin") {
    return join(deps.home, ".config", "claude-code-proxy")
  }
  const base = deps.env.XDG_CONFIG_HOME || join(deps.home, ".config")
  return join(base, "claude-code-proxy")
}

// XDG_STATE_HOME is honored on every platform (including macOS) — that's the
// pre-config.json behavior of log.ts and is documented in the README.
export function resolveStateDir(deps: DirResolverEnv): string {
  const base = deps.env.XDG_STATE_HOME || join(deps.home, ".local", "state")
  return join(base, "claude-code-proxy")
}

// Legacy (pre-config.json) auth/device-id path. Always ~/.config regardless
// of XDG_CONFIG_HOME — this is the directory token stores hardcoded before
// configDir() existed. Used as a read-only fallback so existing logins keep
// working after upgrade.
export function legacyConfigDir(deps: DirResolverEnv = defaults()): string {
  return join(deps.home, ".config", "claude-code-proxy")
}

export function configDir(): string {
  return resolveConfigDir(defaults())
}

export function stateDir(): string {
  return resolveStateDir(defaults())
}
