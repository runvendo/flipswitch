import { readConfig, writeConfig } from "../lib/config.js";
import { setEnvVars, removeEnvVars } from "../lib/claude-settings.js";
import { readLocalState, writeLocalState } from "../lib/local-state.js";
import { MODEL_SLOTS, MODEL_ENV_VARS, type ModelSlot } from "../types.js";
import * as log from "../lib/logger.js";

export async function modelCommand(
  slot: string,
  modelId: string,
  options: { reset?: boolean; local?: boolean }
): Promise<void> {
  if (!MODEL_SLOTS.includes(slot as ModelSlot)) {
    log.error(`Invalid slot "${slot}". Must be one of: ${MODEL_SLOTS.join(", ")}`);
    process.exit(1);
  }

  const typedSlot = slot as ModelSlot;
  const config = readConfig();
  const envVar = MODEL_ENV_VARS[typedSlot];
  const local = options.local;

  if (options.reset) {
    delete config.modelMappings[typedSlot];
    config.activeProfile = null;

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

    writeConfig(config);
    log.success(`${slot} mapping removed. Will use default Claude model.`);
    if (config.enabled || readLocalState()?.enabled) {
      log.info("Restart Claude Code for changes to take effect.");
    }
    return;
  }

  if (!modelId) {
    log.error("Provide a model ID. Example: flipswitch model sonnet google/gemini-2.5-pro");
    log.info("Run `flipswitch models` to see available models.");
    process.exit(1);
  }

  config.modelMappings[typedSlot] = modelId;
  config.activeProfile = null; // manual override clears profile

  if (local) {
    const localState = readLocalState();
    if (localState?.enabled) {
      setEnvVars({ [envVar]: modelId }, true);
      if (!localState.managedEnvVars.includes(envVar)) {
        localState.managedEnvVars.push(envVar);
      }
      writeLocalState(localState);
    }
  } else if (config.enabled) {
    setEnvVars({ [envVar]: modelId });
    if (!config.managedEnvVars.includes(envVar)) {
      config.managedEnvVars.push(envVar);
    }
  }

  writeConfig(config);
  log.success(`${slot} -> ${modelId}`);
  if ((local && readLocalState()?.enabled) || config.enabled) {
    log.info("Restart Claude Code for changes to take effect.");
  } else {
    log.info("This mapping will apply when you run `flipswitch on`.");
  }
}
