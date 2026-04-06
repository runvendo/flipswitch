import chalk from "chalk";
import { readConfig, writeConfig } from "../lib/config.js";
import { setEnvVars, removeEnvVars } from "../lib/claude-settings.js";
import { readLocalState, writeLocalState } from "../lib/local-state.js";
import { PROFILES, MODEL_ENV_VARS, MODEL_SLOTS, type ModelSlot } from "../types.js";
import * as log from "../lib/logger.js";

export async function profileCommand(
  name: string | undefined,
  options: { list?: boolean; reset?: boolean; local?: boolean }
): Promise<void> {
  // List available profiles
  if (options.list || (!name && !options.reset)) {
    listProfiles();
    return;
  }

  // Reset all model mappings
  if (options.reset || name === "default") {
    resetProfile(options.local);
    return;
  }

  // Apply a profile
  if (!name) {
    log.error("Provide a profile name. Run `flipswitch profile --list` to see options.");
    process.exit(1);
  }

  const profile = PROFILES[name];
  if (!profile) {
    log.error(`Unknown profile "${name}".`);
    log.info(`Available profiles: ${Object.keys(PROFILES).join(", ")}, default`);
    process.exit(1);
  }

  const config = readConfig();
  const local = options.local;

  // Apply all three slot mappings
  for (const slot of MODEL_SLOTS) {
    const modelId = profile.mappings[slot];
    config.modelMappings[slot] = modelId;

    if (local) {
      const localState = readLocalState();
      if (localState?.enabled) {
        const envVar = MODEL_ENV_VARS[slot];
        setEnvVars({ [envVar]: modelId }, true);
        if (!localState.managedEnvVars.includes(envVar)) {
          localState.managedEnvVars.push(envVar);
        }
        writeLocalState(localState);
      }
    } else if (config.enabled) {
      const envVar = MODEL_ENV_VARS[slot];
      setEnvVars({ [envVar]: modelId });
      if (!config.managedEnvVars.includes(envVar)) {
        config.managedEnvVars.push(envVar);
      }
    }
  }

  config.activeProfile = name;
  writeConfig(config);

  log.header(`Profile: ${profile.name}`);
  log.success(profile.description);
  console.log();
  for (const slot of MODEL_SLOTS) {
    console.log(`  ${chalk.dim(slot.padEnd(8))} -> ${chalk.cyan(profile.mappings[slot])}`);
  }
  console.log();
  console.log(`  ${chalk.dim(`Cost: ${profile.costHint}`)}`);

  if (config.enabled || readLocalState()?.enabled) {
    console.log();
    log.info("Restart Claude Code for changes to take effect.");
  } else {
    console.log();
    log.info("These mappings will apply when you run `flipswitch on`.");
  }
}

function listProfiles(): void {
  const config = readConfig();

  log.header("Profiles");
  console.log();
  log.dim("Apply a preset with: flipswitch profile <name>");
  console.log();

  for (const profile of Object.values(PROFILES)) {
    const active = config.activeProfile === profile.name ? chalk.green(" (active)") : "";
    console.log(`  ${chalk.bold(profile.name)}${active} ${chalk.dim("—")} ${profile.description}`);
    for (const slot of MODEL_SLOTS) {
      console.log(`    ${chalk.dim(slot.padEnd(8))} -> ${profile.mappings[slot]}`);
    }
    console.log(`    ${chalk.dim(`Cost: ${profile.costHint}`)}`);
    console.log();
  }

  console.log(`  ${chalk.bold("default")} ${chalk.dim("—")} Reset to standard Claude models`);
  console.log();
}

function resetProfile(local?: boolean): void {
  const config = readConfig();

  // Remove all model mappings
  for (const slot of MODEL_SLOTS) {
    delete config.modelMappings[slot];
    const envVar = MODEL_ENV_VARS[slot];

    if (local) {
      const localState = readLocalState();
      if (localState?.enabled) {
        removeEnvVars([envVar], true);
        localState.managedEnvVars = localState.managedEnvVars.filter((v) => v !== envVar);
        writeLocalState(localState);
      }
    } else if (config.enabled) {
      removeEnvVars([envVar]);
      config.managedEnvVars = config.managedEnvVars.filter((v) => v !== envVar);
    }
  }

  config.activeProfile = null;
  writeConfig(config);

  log.success("Profile reset. All slots back to default Claude models.");
  if (config.enabled || readLocalState()?.enabled) {
    log.info("Restart Claude Code for changes to take effect.");
  }
}
