import chalk from "chalk";
import { readConfig, getConfigPath } from "../lib/config.js";
import { getEnvVars, getSettingsPath } from "../lib/claude-settings.js";
import { MODEL_SLOTS, MODEL_ENV_VARS } from "../types.js";
import * as log from "../lib/logger.js";

export async function statusCommand(): Promise<void> {
  const config = readConfig();
  const envVars = getEnvVars();

  log.header("Flipswitch Status");
  console.log();

  // State
  const state = config.enabled
    ? chalk.green("ON") + chalk.dim(" (routing through OpenRouter)")
    : chalk.dim("OFF") + chalk.dim(" (direct Anthropic API)");
  log.label("State:    ", state);

  // Auth mode
  const authMode =
    config.authMode === "vendo"
      ? "Vendo (managed key)"
      : config.authMode === "direct"
        ? "Direct OpenRouter key"
        : chalk.dim("Not configured");
  log.label("Auth:     ", authMode);

  // API key
  const keyDisplay = config.apiKey
    ? log.maskKey(config.apiKey)
    : chalk.dim("None");
  log.label("API Key:  ", keyDisplay);

  // Model mappings
  console.log();
  console.log(chalk.bold("  Model Mappings:"));
  for (const slot of MODEL_SLOTS) {
    const mapping = config.modelMappings[slot];
    const envVar = MODEL_ENV_VARS[slot];
    const active = envVars[envVar];
    if (mapping) {
      console.log(`    ${slot.padEnd(8)} -> ${chalk.cyan(mapping)}`);
    } else {
      console.log(`    ${slot.padEnd(8)} -> ${chalk.dim("(default)")}`);
    }
  }

  // Active env vars in claude settings
  const managedVars = config.managedEnvVars;
  if (managedVars.length > 0) {
    console.log();
    console.log(chalk.bold("  Claude Code env vars") + chalk.dim(` (${getSettingsPath()})`) + chalk.bold(":"));
    for (const key of managedVars) {
      const val = envVars[key];
      const display =
        key === "ANTHROPIC_AUTH_TOKEN" && val
          ? log.maskKey(val)
          : key === "ANTHROPIC_API_KEY" && val === ""
            ? chalk.dim("(empty)")
            : val ?? chalk.dim("(not set)");
      console.log(`    ${key} = ${display}`);
    }
  }

  console.log();
}
