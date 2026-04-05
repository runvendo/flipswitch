import { readConfig, writeConfig } from "../lib/config.js";
import { setEnvVars } from "../lib/claude-settings.js";
import { OPENROUTER_BASE_URL, MODEL_ENV_VARS, type ModelSlot } from "../types.js";
import * as log from "../lib/logger.js";

/**
 * Core logic to enable routing. Used by `on`, `login`, and `key` commands.
 * Does not exit on error — returns false if no key is configured.
 */
export function enableRouting(): boolean {
  const config = readConfig();

  if (!config.apiKey) {
    return false;
  }

  // Build the env vars to set
  const envVars: Record<string, string> = {
    ANTHROPIC_BASE_URL: OPENROUTER_BASE_URL,
    ANTHROPIC_AUTH_TOKEN: config.apiKey,
    ANTHROPIC_API_KEY: "",
  };

  const managedKeys = [
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_API_KEY",
  ];

  // Add model mappings if configured
  for (const [slot, modelId] of Object.entries(config.modelMappings)) {
    if (modelId) {
      const envVar = MODEL_ENV_VARS[slot as ModelSlot];
      envVars[envVar] = modelId;
      managedKeys.push(envVar);
    }
  }

  // Write to ~/.claude/settings.json
  setEnvVars(envVars);

  // Update flipswitch config
  config.enabled = true;
  config.managedEnvVars = managedKeys;
  writeConfig(config);

  return true;
}

export async function onCommand(): Promise<void> {
  const config = readConfig();

  if (!config.apiKey) {
    log.error("No API key configured.");
    log.info("Run `flipswitch` to get started with Vendo, or `flipswitch key <key>` to use your own OpenRouter key.");
    process.exit(1);
  }

  enableRouting();

  log.header("Flipswitch ON");
  log.success("Claude Code will now route through OpenRouter.");
  log.info("Restart any running Claude Code sessions for changes to take effect.");
}
