import { describe, expect, it, afterEach } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { resolveModel } from "./model-allowlist.ts"
import { loadConfig } from "../../../config.ts"

afterEach(() => {
  loadConfig({ forceReload: true })
})

describe("resolveModel", () => {
  it("returns alias when no override is set", () => {
    loadConfig({ env: {}, forceReload: true })
    expect(resolveModel("sonnet")).toBe("gpt-5.4")
  })

  it("env CCP_CODEX_MODEL takes precedence", () => {
    loadConfig({ env: { CCP_CODEX_MODEL: "gpt-5.2" }, forceReload: true })
    expect(resolveModel("sonnet")).toBe("gpt-5.2")
  })

  it("config.json codex.model overrides aliases", () => {
    const dir = mkdtempSync(join(tmpdir(), "ccp-model-"))
    const path = join(dir, "config.json")
    writeFileSync(path, JSON.stringify({ codex: { model: "gpt-5.5" } }))
    try {
      loadConfig({ configPath: path, env: {}, forceReload: true })
      expect(resolveModel("sonnet")).toBe("gpt-5.5")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("empty CCP_CODEX_MODEL env is treated as unset (no regression)", () => {
    const dir = mkdtempSync(join(tmpdir(), "ccp-model-"))
    const path = join(dir, "config.json")
    writeFileSync(path, JSON.stringify({ codex: { model: "gpt-5.5" } }))
    try {
      loadConfig({
        configPath: path,
        env: { CCP_CODEX_MODEL: "" },
        forceReload: true,
      })
      // Empty env should fall through to file value
      expect(resolveModel("sonnet")).toBe("gpt-5.5")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("empty env and no file value falls through to alias", () => {
    loadConfig({ env: { CCP_CODEX_MODEL: "" }, forceReload: true })
    expect(resolveModel("sonnet")).toBe("gpt-5.4")
  })
})
