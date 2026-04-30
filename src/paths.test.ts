import { describe, expect, it } from "bun:test"
import { resolveConfigDir, resolveStateDir } from "./paths.ts"

describe("resolveConfigDir", () => {
  it("uses ~/.config on darwin even when XDG_CONFIG_HOME is set", () => {
    expect(
      resolveConfigDir({ platform: "darwin", env: { XDG_CONFIG_HOME: "/x" }, home: "/home/u" }),
    ).toBe("/home/u/.config/claude-code-proxy")
  })

  it("honors XDG_CONFIG_HOME on linux", () => {
    expect(
      resolveConfigDir({ platform: "linux", env: { XDG_CONFIG_HOME: "/x" }, home: "/home/u" }),
    ).toBe("/x/claude-code-proxy")
  })

  it("falls back to $HOME/.config on linux without XDG_CONFIG_HOME", () => {
    expect(resolveConfigDir({ platform: "linux", env: {}, home: "/home/u" })).toBe(
      "/home/u/.config/claude-code-proxy",
    )
  })
})

describe("resolveStateDir", () => {
  it("honors XDG_STATE_HOME on darwin (preserves pre-existing log.ts behavior)", () => {
    expect(
      resolveStateDir({ platform: "darwin", env: { XDG_STATE_HOME: "/x" }, home: "/home/u" }),
    ).toBe("/x/claude-code-proxy")
  })

  it("falls back to $HOME/.local/state on darwin without XDG_STATE_HOME", () => {
    expect(resolveStateDir({ platform: "darwin", env: {}, home: "/home/u" })).toBe(
      "/home/u/.local/state/claude-code-proxy",
    )
  })

  it("honors XDG_STATE_HOME on linux", () => {
    expect(
      resolveStateDir({ platform: "linux", env: { XDG_STATE_HOME: "/x" }, home: "/home/u" }),
    ).toBe("/x/claude-code-proxy")
  })
})
