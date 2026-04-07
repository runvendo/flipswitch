import { readConfig, writeConfig } from "../lib/config.js";
import { performLogin } from "../lib/auth.js";
import { enableRouting } from "./on.js";
import { VENDO_BASE_URL } from "../types.js";
import * as log from "../lib/logger.js";

export async function loginCommand(): Promise<void> {
  log.info("Opening Vendo in your browser...");

  const spin = log.spinner("Waiting for authorization...");
  let result;
  try {
    result = await performLogin();
  } catch (e: any) {
    spin.fail(e.message);
    log.info(
      `If the browser didn't open, visit ${VENDO_BASE_URL}/authorize?app=flipswitch manually.`
    );
    process.exit(1);
  }
  spin.succeed("Logged in via Vendo");

  // Save credentials
  const config = readConfig();
  config.authMode = "vendo";
  config.apiKey = result.apiKey;
  config.vendoUserId = result.userId;
  writeConfig(config);

  // Auto-enable routing so the user doesn't need a separate step
  enableRouting();
  log.success("Claude Code routing enabled");

  // Show balance and funding info
  console.log();
  const balance = result.balanceUsd.toFixed(2);
  if (result.balanceUsd <= 0) {
    log.warn(`Your balance: $${balance}`);
    log.info("Add credits to start using AI models:");
    log.info(`→ ${VENDO_BASE_URL}/settings/billing`);
  } else {
    log.success(`Your balance: $${balance}`);
  }

  console.log();
  log.info(
    "Restart any running Claude Code sessions for changes to take effect."
  );
}
