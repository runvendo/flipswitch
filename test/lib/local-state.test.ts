import { describe, it, expect, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "flipswitch-ls-test-"));

vi.spyOn(process, "cwd").mockReturnValue(tempDir);

const { readLocalState, writeLocalState, removeLocalState } = await import(
  "../../src/lib/local-state.js"
);

const STATE_FILE = join(tempDir, ".flipswitch.json");

describe("local-state", () => {
  afterEach(() => {
    if (existsSync(STATE_FILE)) {
      rmSync(STATE_FILE);
    }
  });

  it("returns null when no file exists", () => {
    const state = readLocalState();
    expect(state).toBeNull();
  });

  it("writes and reads state correctly", () => {
    writeLocalState({ enabled: true, managedEnvVars: [] });

    const loaded = readLocalState();
    expect(loaded).not.toBeNull();
    expect(loaded!.enabled).toBe(true);
    expect(loaded!.managedEnvVars).toEqual([]);
  });

  it("removes the file", () => {
    writeLocalState({ enabled: false, managedEnvVars: [] });
    expect(existsSync(STATE_FILE)).toBe(true);

    removeLocalState();
    expect(existsSync(STATE_FILE)).toBe(false);
  });

  it("returns null on corrupt JSON", () => {
    writeFileSync(STATE_FILE, "{ this is not valid json", "utf-8");

    const state = readLocalState();
    expect(state).toBeNull();
  });

  it("preserves managedEnvVars array", () => {
    const vars = ["ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN"];
    writeLocalState({ enabled: true, managedEnvVars: vars });

    const loaded = readLocalState();
    expect(loaded!.managedEnvVars).toEqual([
      "ANTHROPIC_BASE_URL",
      "ANTHROPIC_AUTH_TOKEN",
    ]);
  });

  it("does not throw when removeLocalState is called with no file present", () => {
    expect(() => removeLocalState()).not.toThrow();
  });
});
