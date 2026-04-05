import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mock homedir before importing config module
const tempHome = mkdtempSync(join(tmpdir(), "flipswitch-test-"));

vi.mock("node:os", async () => {
  const actual = await vi.importActual("node:os");
  return { ...actual, homedir: () => tempHome };
});

const { readConfig, writeConfig, getConfigPath } = await import(
  "../../src/lib/config.js"
);

describe("config", () => {
  afterEach(() => {
    // Clean up config dir between tests
    const configDir = join(tempHome, ".flipswitch");
    if (existsSync(configDir)) {
      rmSync(configDir, { recursive: true });
    }
  });

  it("returns default config when no file exists", () => {
    const config = readConfig();
    expect(config.version).toBe(1);
    expect(config.enabled).toBe(false);
    expect(config.apiKey).toBeNull();
    expect(config.authMode).toBeNull();
    expect(config.managedEnvVars).toEqual([]);
  });

  it("writes and reads config", () => {
    const config = readConfig();
    config.apiKey = "sk-or-v1-test123";
    config.authMode = "direct";
    config.enabled = true;
    writeConfig(config);

    const loaded = readConfig();
    expect(loaded.apiKey).toBe("sk-or-v1-test123");
    expect(loaded.authMode).toBe("direct");
    expect(loaded.enabled).toBe(true);
  });

  it("creates config directory if missing", () => {
    const config = readConfig();
    config.apiKey = "test";
    writeConfig(config);

    expect(existsSync(join(tempHome, ".flipswitch"))).toBe(true);
    expect(existsSync(join(tempHome, ".flipswitch", "config.json"))).toBe(true);
  });

  it("preserves model mappings", () => {
    const config = readConfig();
    config.modelMappings = { sonnet: "google/gemini-2.5-pro" };
    writeConfig(config);

    const loaded = readConfig();
    expect(loaded.modelMappings.sonnet).toBe("google/gemini-2.5-pro");
  });

  it("tracks managedEnvVars", () => {
    const config = readConfig();
    config.managedEnvVars = ["ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN"];
    writeConfig(config);

    const loaded = readConfig();
    expect(loaded.managedEnvVars).toEqual([
      "ANTHROPIC_BASE_URL",
      "ANTHROPIC_AUTH_TOKEN",
    ]);
  });
});
