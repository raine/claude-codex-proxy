#!/usr/bin/env bun
import { startServer } from "./server.ts"
import { createLogger, logDir } from "./log.ts"
import { getProvider, listProviders } from "./providers/registry.ts"
import type { CliHandlers } from "./providers/types.ts"

declare const BUILD_VERSION: string | undefined
const VERSION = typeof BUILD_VERSION === "string" ? BUILD_VERSION : "dev"

const log = createLogger("cli")

async function main() {
  const args = process.argv.slice(2)
  const [first, ...rest] = args

  if (first === "--version" || first === "-v" || first === "version") {
    console.log(`claude-code-proxy ${VERSION}`)
    return
  }

  if (!first || first === "serve") {
    const providerName = argFlag(rest, "--provider") ?? process.env.CCP_PROVIDER ?? "codex"
    const provider = getProvider(providerName)
    const port = Number(process.env.PORT ?? 18765)
    startServer({ port, provider })
    console.log(`Proxy listening on http://localhost:${port} (provider: ${provider.name})`)
    console.log(`Logs: ${logDir()}/proxy.log`)
    console.log()
    console.log("Configure Claude Code:")
    console.log(`  export ANTHROPIC_BASE_URL="http://localhost:${port}"`)
    console.log(`  export ANTHROPIC_AUTH_TOKEN="anything"`)
    if (provider.name === "codex") {
      console.log(`  export ANTHROPIC_MODEL="gpt-5.4"`)
    }
    console.log(`  export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"`)
    return
  }

  if (listProviders().includes(first)) {
    const provider = getProvider(first)
    await runProviderCommand(provider.name, provider.cli, rest)
    return
  }

  usageAndExit()
}

async function runProviderCommand(name: string, cli: CliHandlers, args: string[]): Promise<void> {
  const [group, sub] = args
  if (group !== "auth") usageAndExit()

  switch (sub) {
    case "login":
      if (!cli.login) {
        console.error(`${name}: browser login not supported`)
        process.exit(2)
      }
      await cli.login()
      process.exit(0)
    case "device":
      if (!cli.device) {
        console.error(`${name}: device login not supported`)
        process.exit(2)
      }
      await cli.device()
      process.exit(0)
    case "status":
      await cli.status()
      return
    case "logout":
      await cli.logout()
      return
    default:
      usageAndExit()
  }
}

function argFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  if (i === -1) return undefined
  return args[i + 1]
}

function usageAndExit(): never {
  const providers = listProviders().join("|")
  console.log(`Usage:
  claude-code-proxy serve [--provider ${providers}]    Run proxy (PORT env, default 18765)
  claude-code-proxy <provider> auth login              Browser OAuth
  claude-code-proxy <provider> auth device             Device-code OAuth
  claude-code-proxy <provider> auth status             Show current auth
  claude-code-proxy <provider> auth logout             Clear stored auth
  claude-code-proxy --version                          Show version

Providers: ${providers}
Default provider: ${process.env.CCP_PROVIDER ?? "codex"} (override with CCP_PROVIDER or --provider)
`)
  process.exit(2)
}

main().catch((err) => {
  log.error("cli fatal", { err: String(err), stack: (err as Error)?.stack })
  console.error(err)
  process.exit(1)
})
