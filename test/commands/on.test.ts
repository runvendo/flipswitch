import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/lib/config.js", () => ({
  readConfig: vi.fn(),
  writeConfig: vi.fn(),
}));

vi.mock("../../src/lib/claude-settings.js", () => ({
  setEnvVars: vi.fn(),
}));

vi.mock("../../src/lib/local-state.js", () => ({
  writeLocalState: vi.fn(),
}));

vi.mock("../../src/lib/logger.js", () => ({
  error: vi.fn(),
}));

const { readConfig, writeConfig } = await import("../../src/lib/config.js");
const { setEnvVars } = await import("../../src/lib/claude-settings.js");
const { writeLocalState } = await import("../../src/lib/local-state.js");
const log = await import("../../src/lib/logger.js");
const { enableRouting } = await import("../../src/commands/on.js");

const DEFAULT_CONFIG = {
  version: 1 as const,
  authMode: null,
  apiKey: null,
  baseUrl: null,
  vendoUserId: null,
  vendoTenantId: null,
  enabled: false,
  modelMappings: {},
  activeProfile: null,
  managedEnvVars: [],
};

describe("enableRouting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readConfig).mockReturnValue({ ...DEFAULT_CONFIG });
  });

  it("returns false when no API key is configured", () => {
    vi.mocked(readConfig).mockReturnValue({ ...DEFAULT_CONFIG, apiKey: null });

    const result = enableRouting();

    expect(result).toBe(false);
    expect(setEnvVars).not.toHaveBeenCalled();
  });

  it("returns true and sets env vars when API key exists", () => {
    vi.mocked(readConfig).mockReturnValue({
      ...DEFAULT_CONFIG,
      apiKey: "sk-or-v1-testkey",
    });

    const result = enableRouting();

    expect(result).toBe(true);
    expect(setEnvVars).toHaveBeenCalledWith(
      expect.objectContaining({
        ANTHROPIC_BASE_URL: "https://openrouter.ai/api",
        ANTHROPIC_API_KEY: "sk-or-v1-testkey",
        ANTHROPIC_AUTH_TOKEN: "sk-or-v1-testkey",
        DISABLE_TELEMETRY: "true",
        DISABLE_COST_WARNINGS: "true",
      }),
      undefined
    );
  });

  it("includes model mappings in env vars when configured", () => {
    vi.mocked(readConfig).mockReturnValue({
      ...DEFAULT_CONFIG,
      apiKey: "sk-or-v1-testkey",
      modelMappings: {
        sonnet: "google/gemini-2.5-pro",
        haiku: "deepseek/deepseek-v3",
      },
    });

    const result = enableRouting();

    expect(result).toBe(true);
    expect(setEnvVars).toHaveBeenCalledWith(
      expect.objectContaining({
        ANTHROPIC_DEFAULT_SONNET_MODEL: "google/gemini-2.5-pro",
        ANTHROPIC_DEFAULT_HAIKU_MODEL: "deepseek/deepseek-v3",
      }),
      undefined
    );
  });

  it("does not include model env vars for unset slots", () => {
    vi.mocked(readConfig).mockReturnValue({
      ...DEFAULT_CONFIG,
      apiKey: "sk-or-v1-testkey",
      modelMappings: { sonnet: "google/gemini-2.5-pro" },
    });

    enableRouting();

    const envVarsArg = vi.mocked(setEnvVars).mock.calls[0][0];
    expect(envVarsArg).not.toHaveProperty("ANTHROPIC_DEFAULT_OPUS_MODEL");
    expect(envVarsArg).not.toHaveProperty("ANTHROPIC_DEFAULT_HAIKU_MODEL");
  });

  it("writes local state and does not write global config when --local option used", () => {
    const config = { ...DEFAULT_CONFIG, apiKey: "sk-or-v1-testkey" };
    vi.mocked(readConfig).mockReturnValue(config);

    const result = enableRouting({ local: true });

    expect(result).toBe(true);
    expect(setEnvVars).toHaveBeenCalledWith(expect.any(Object), true);
    expect(writeLocalState).toHaveBeenCalledWith({
      enabled: true,
      managedEnvVars: expect.arrayContaining([
        "ANTHROPIC_BASE_URL",
        "ANTHROPIC_API_KEY",
        "ANTHROPIC_AUTH_TOKEN",
        "DISABLE_TELEMETRY",
        "DISABLE_COST_WARNINGS",
      ]),
    });
    expect(writeConfig).not.toHaveBeenCalled();
  });

  it("writes global config and does not write local state when no --local option", () => {
    const config = { ...DEFAULT_CONFIG, apiKey: "sk-or-v1-testkey" };
    vi.mocked(readConfig).mockReturnValue(config);

    const result = enableRouting();

    expect(result).toBe(true);
    expect(writeConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        managedEnvVars: expect.arrayContaining([
          "ANTHROPIC_BASE_URL",
          "ANTHROPIC_API_KEY",
          "ANTHROPIC_AUTH_TOKEN",
          "DISABLE_TELEMETRY",
          "DISABLE_COST_WARNINGS",
        ]),
      })
    );
    expect(writeLocalState).not.toHaveBeenCalled();
  });

  it("uses Vendo proxy base URL when baseUrl is set in config", () => {
    vi.mocked(readConfig).mockReturnValue({
      ...DEFAULT_CONFIG,
      authMode: "vendo",
      apiKey: "vendo_sk_testkey",
      baseUrl: "https://openrouter-proxy.vendo.run",
    });

    const result = enableRouting();

    expect(result).toBe(true);
    expect(setEnvVars).toHaveBeenCalledWith(
      expect.objectContaining({
        ANTHROPIC_BASE_URL: "https://openrouter-proxy.vendo.run",
        ANTHROPIC_API_KEY: "vendo_sk_testkey",
        ANTHROPIC_AUTH_TOKEN: "vendo_sk_testkey",
      }),
      undefined
    );
  });

  it("falls back to Vendo proxy URL for vendo keys when baseUrl is null (pre-update config)", () => {
    vi.mocked(readConfig).mockReturnValue({
      ...DEFAULT_CONFIG,
      authMode: "vendo",
      apiKey: "vendo_sk_testkey",
      baseUrl: null,
    });

    const result = enableRouting();

    expect(result).toBe(true);
    expect(setEnvVars).toHaveBeenCalledWith(
      expect.objectContaining({
        ANTHROPIC_BASE_URL: "https://openrouter-proxy.vendo.run",
      }),
      undefined
    );
  });

  it("falls back to OpenRouter base URL for direct keys when baseUrl is null", () => {
    vi.mocked(readConfig).mockReturnValue({
      ...DEFAULT_CONFIG,
      authMode: "direct",
      apiKey: "sk-or-v1-testkey",
      baseUrl: null,
    });

    const result = enableRouting();

    expect(result).toBe(true);
    expect(setEnvVars).toHaveBeenCalledWith(
      expect.objectContaining({
        ANTHROPIC_BASE_URL: "https://openrouter.ai/api",
      }),
      undefined
    );
  });

  it("returns false and logs an error when setEnvVars throws", () => {
    vi.mocked(readConfig).mockReturnValue({
      ...DEFAULT_CONFIG,
      apiKey: "sk-or-v1-testkey",
    });
    vi.mocked(setEnvVars).mockImplementation(() => {
      throw new Error("permission denied");
    });

    const result = enableRouting();

    expect(result).toBe(false);
    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining("permission denied")
    );
    expect(writeConfig).not.toHaveBeenCalled();
    expect(writeLocalState).not.toHaveBeenCalled();
  });
});
