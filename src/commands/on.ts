import { readConfig, writeConfig } from "../lib/config.js";
import { setEnvVars } from "../lib/claude-settings.js";
import { writeLocalState } from "../lib/local-state.js";
import {
  OPENROUTER_BASE_URL,
  MODEL_ENV_VARS,
  type ModelSlot,
} from "../types.js";
import * as log from "../lib/logger.js";

/**
 * Core logic to enable routing. Used by `on` command.
 * Both Vendo and direct key users route through openrouter.ai/api.
 */
export function enableRouting(options?: { local?: boolean }): boolean {
  const config = readConfig();
  const local = options?.local;

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

  // Write to settings.json (local or global)
  setEnvVars(envVars, local);

  if (local) {
    // Track locally in .flipswitch.json
    writeLocalState({ enabled: true, managedEnvVars: managedKeys });
  } else {
    // Track globally in ~/.flipswitch/config.json
    config.enabled = true;
    config.managedEnvVars = managedKeys;
    writeConfig(config);
  }

  return true;
}

export async function onCommand(options?: { local?: boolean }): Promise<void> {
  const config = readConfig();

  if (!config.apiKey) {
    log.error("No API key configured.");
    log.info(
      "Run `flipswitch` to get started with Vendo, or `flipswitch key <key>` to use your own OpenRouter key."
    );
    process.exit(1);
  }

  enableRouting(options);

  log.header("Flipswitch ON");
  if (options?.local) {
    log.success("Claude Code will route through OpenRouter in this project.");
  } else {
    log.success("Claude Code will now route through OpenRouter.");
  }
  log.info(
    "Restart any running Claude Code sessions for changes to take effect."
  );
}
