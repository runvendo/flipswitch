import { readConfig, writeConfig } from "../lib/config.js";
import { removeEnvVars } from "../lib/claude-settings.js";
import { readLocalState, removeLocalState } from "../lib/local-state.js";
import * as log from "../lib/logger.js";

export async function offCommand(options?: { local?: boolean }): Promise<void> {
  if (options?.local) {
    const localState = readLocalState();

    if (!localState?.enabled && (!localState?.managedEnvVars?.length)) {
      log.info("Flipswitch is already off locally.");
      return;
    }

    if (localState?.managedEnvVars?.length) {
      removeEnvVars(localState.managedEnvVars, true);
    }

    removeLocalState();

    log.header("Flipswitch OFF (local)");
    log.success("Claude Code will use default settings in this project.");
    log.info("Restart any running Claude Code sessions for changes to take effect.");
    return;
  }

  const config = readConfig();

  if (!config.enabled && config.managedEnvVars.length === 0) {
    log.info("Flipswitch is already off.");
    return;
  }

  // Remove only the env vars that flipswitch set
  if (config.managedEnvVars.length > 0) {
    removeEnvVars(config.managedEnvVars);
  }

  config.enabled = false;
  config.managedEnvVars = [];
  writeConfig(config);

  log.header("Flipswitch OFF");
  log.success("Claude Code will use the direct Anthropic API.");
  log.info("Restart any running Claude Code sessions for changes to take effect.");
}
