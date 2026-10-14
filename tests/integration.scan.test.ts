import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { loadEntries, readConfig, scanWorkspace } from "../tui.tsx"

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "opm-integration-"))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function ctx() {
  return {
    client: {
      plugin: { list: vi.fn(() => Promise.resolve([])) },
      config: { get: vi.fn(() => Promise.resolve({})) },
    },
  } as never
}

describe("tmpdir scanWorkspace -> loadEntries end-to-end", () => {
  test("discovers a peerDependencies-only project and reads a JSONC config", async () => {
    // Local plugin declared solely via peerDependencies (no dependencies block).
    const proj = join(root, "peer-proj")
    mkdirSync(proj, { recursive: true })
    writeFileSync(
      join(proj, "package.json"),
      JSON.stringify({ name: "peer-proj", peerDependencies: { "@opencode/plugin": "*" } }),
    )

    // JSONC with comments, a trailing comma and explicit registration spec.
    writeFileSync(join(root, "opencode.jsonc"), '{\n  "plugins": ["./peer-proj",], // dev-installed\n}\n')

    const scanned = scanWorkspace(root)
    expect(scanned.map((e) => e.name)).toContain("peer-proj")

    const cfg = readConfig(join(root, "opencode.jsonc"))
    expect(cfg.ok).toBe(true)
    expect(cfg.plugins).toEqual(["./peer-proj"])

    const entries = await loadEntries(ctx(), root)
    expect(entries.some((e) => e.name === "peer-proj")).toBe(true)
  })
})
