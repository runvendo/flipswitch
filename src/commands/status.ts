import chalk from "chalk";
import { readConfig } from "../lib/config.js";
import { getEnvVars, getSettingsPath } from "../lib/claude-settings.js";
import { readLocalState } from "../lib/local-state.js";
import { MODEL_SLOTS, PROFILES } from "../types.js";
import * as log from "../lib/logger.js";

export async function statusCommand(options?: { local?: boolean }): Promise<void> {
  const config = readConfig();
  const local = options?.local;
  const envVars = getEnvVars(local);

  if (local) {
    const localState = readLocalState();
    log.header("Flipswitch Status (local)");
    console.log();

    const provider = config.authMode === "vendo" ? "Vendo" : "OpenRouter";
    const state = localState?.enabled
      ? chalk.green("ON") + chalk.dim(` (routing through ${provider})`)
      : chalk.dim("OFF") + chalk.dim(" (using global settings)");
    log.label("State:    ", state);

    const managedVars = localState?.managedEnvVars ?? [];
    if (managedVars.length > 0) {
      console.log();
      console.log(chalk.bold("  Local env vars") + chalk.dim(` (${getSettingsPath(true)})`) + chalk.bold(":"));
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
    } else {
      console.log();
      console.log(chalk.dim("  No local configuration. Run `flipswitch on --local` to enable for this project."));
    }

    console.log();
    return;
  }

  log.header("Flipswitch Status");
  console.log();

  // State
  const globalProvider = config.authMode === "vendo" ? "Vendo" : "OpenRouter";
  const state = config.enabled
    ? chalk.green("ON") + chalk.dim(` (routing through ${globalProvider})`)
    : chalk.dim("OFF") + chalk.dim(" (direct Anthropic API)");
  log.label("State:    ", state);

  // Auth mode
  const authMode =
    config.authMode === "vendo"
      ? "Vendo (vendo.run)"
      : config.authMode === "direct"
        ? "Direct OpenRouter key"
        : chalk.dim("Not configured");
  log.label("Auth:     ", authMode);

  // Active profile
  if (config.activeProfile && PROFILES[config.activeProfile]) {
    const p = PROFILES[config.activeProfile];
    log.label("Profile:  ", chalk.cyan(p.name) + chalk.dim(` — ${p.description}`));
  }

  // Model mappings
  console.log();
  console.log(chalk.bold("  Model Mappings:"));
  for (const slot of MODEL_SLOTS) {
    const mapping = config.modelMappings[slot];
    if (mapping) {
      console.log(`    ${slot.padEnd(8)} -> ${chalk.cyan(mapping)}`);
    } else {
      console.log(`    ${slot.padEnd(8)} -> ${chalk.dim("(default)")}`);
    }
  }

  // Check for local override
  const localState = readLocalState();
  if (localState?.enabled) {
    console.log();
    console.log(chalk.yellow("  Local override active in this project.") + chalk.dim(" Run `flipswitch status --local` for details."));
  }

  console.log();
}
