import { readConfig, writeConfig } from "../lib/config.js";
import { removeEnvVars } from "../lib/claude-settings.js";
import * as log from "../lib/logger.js";

export async function offCommand(): Promise<void> {
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
