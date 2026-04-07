import { readConfig, writeConfig } from "../lib/config.js";
import { removeEnvVars } from "../lib/claude-settings.js";
import { revokeKey } from "../lib/auth.js";
import * as log from "../lib/logger.js";

export async function logoutCommand(): Promise<void> {
  const config = readConfig();

  if (!config.apiKey && !config.vendoUserId) {
    log.info("Not logged in.");
    return;
  }

  // If enabled, disable routing first
  if (config.enabled && config.managedEnvVars.length > 0) {
    removeEnvVars(config.managedEnvVars);
  }

  // Revoke the managed key on Vendo (best effort)
  if (config.authMode === "vendo" && config.apiKey) {
    const spin = log.spinner("Revoking key...");
    await revokeKey(config.apiKey);
    spin.stop();
  }

  // Clear all auth state
  config.authMode = null;
  config.apiKey = null;
  config.vendoUserId = null;
  config.enabled = false;
  config.managedEnvVars = [];
  writeConfig(config);

  log.success("Logged out. Credentials cleared.");
  log.info("Restart any running Claude Code sessions for changes to take effect.");
}
