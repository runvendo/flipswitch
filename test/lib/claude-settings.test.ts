import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempHome = mkdtempSync(join(tmpdir(), "flipswitch-cs-test-"));

vi.mock("node:os", async () => {
  const actual = await vi.importActual("node:os");
  return { ...actual, homedir: () => tempHome };
});

const { readSettings, setEnvVars, removeEnvVars, getEnvVars, getSettingsPath } =
  await import("../../src/lib/claude-settings.js");

describe("claude-settings", () => {
  const claudeDir = join(tempHome, ".claude");
  const settingsPath = join(claudeDir, "settings.json");

  beforeEach(() => {
    if (existsSync(claudeDir)) {
      rmSync(claudeDir, { recursive: true });
    }
  });

  it("returns empty object when settings file does not exist", () => {
    const settings = readSettings();
    expect(settings).toEqual({});
  });

  it("sets env vars when no settings file exists", () => {
    setEnvVars({ ANTHROPIC_BASE_URL: "https://openrouter.ai/api" });

    const raw = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(raw.env.ANTHROPIC_BASE_URL).toBe("https://openrouter.ai/api");
  });

  it("preserves existing non-env settings", () => {
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      settingsPath,
      JSON.stringify({
        permissions: { allow: ["Read"] },
        hooks: { test: true },
      })
    );

    setEnvVars({ ANTHROPIC_BASE_URL: "https://openrouter.ai/api" });

    const raw = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(raw.permissions).toEqual({ allow: ["Read"] });
    expect(raw.hooks).toEqual({ test: true });
    expect(raw.env.ANTHROPIC_BASE_URL).toBe("https://openrouter.ai/api");
  });

  it("merges env vars with existing env vars", () => {
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      settingsPath,
      JSON.stringify({
        env: { EXISTING_VAR: "keep-me" },
      })
    );

    setEnvVars({ ANTHROPIC_BASE_URL: "https://openrouter.ai/api" });

    const raw = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(raw.env.EXISTING_VAR).toBe("keep-me");
    expect(raw.env.ANTHROPIC_BASE_URL).toBe("https://openrouter.ai/api");
  });

  it("removes specific env vars", () => {
    setEnvVars({
      ANTHROPIC_BASE_URL: "https://openrouter.ai/api",
      ANTHROPIC_AUTH_TOKEN: "sk-or-test",
      ANTHROPIC_API_KEY: "",
    });

    removeEnvVars(["ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN"]);

    const raw = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(raw.env.ANTHROPIC_BASE_URL).toBeUndefined();
    expect(raw.env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    expect(raw.env.ANTHROPIC_API_KEY).toBe("");
  });

  it("removes env block entirely when empty", () => {
    setEnvVars({ ANTHROPIC_BASE_URL: "test" });
    removeEnvVars(["ANTHROPIC_BASE_URL"]);

    const raw = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(raw.env).toBeUndefined();
  });

  it("does not touch env vars it does not own", () => {
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      settingsPath,
      JSON.stringify({
        env: {
          USER_CUSTOM_VAR: "my-value",
          ANTHROPIC_BASE_URL: "https://openrouter.ai/api",
        },
      })
    );

    removeEnvVars(["ANTHROPIC_BASE_URL"]);

    const raw = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(raw.env.USER_CUSTOM_VAR).toBe("my-value");
    expect(raw.env.ANTHROPIC_BASE_URL).toBeUndefined();
  });

  it("handles full on/off cycle", () => {
    // Simulate existing settings
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      settingsPath,
      JSON.stringify({ permissions: { allow: ["Bash(npm *)"] } })
    );

    // ON
    const onVars = {
      ANTHROPIC_BASE_URL: "https://openrouter.ai/api",
      ANTHROPIC_AUTH_TOKEN: "sk-or-v1-test",
      ANTHROPIC_API_KEY: "",
    };
    setEnvVars(onVars);

    let raw = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(raw.env.ANTHROPIC_BASE_URL).toBe("https://openrouter.ai/api");
    expect(raw.permissions).toEqual({ allow: ["Bash(npm *)"] });

    // OFF
    removeEnvVars(Object.keys(onVars));

    raw = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(raw.env).toBeUndefined();
    expect(raw.permissions).toEqual({ allow: ["Bash(npm *)"] });
  });
});
