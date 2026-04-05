import { readConfig, writeConfig } from "../lib/config.js";
import { performLogin } from "../lib/auth.js";
import { enableRouting } from "./on.js";
import * as log from "../lib/logger.js";

export async function loginCommand(): Promise<void> {
  log.info("Opening Vendo in your browser...");

  let result;
  try {
    result = await performLogin();
  } catch (e: any) {
    log.error(e.message);
    log.info("If the browser didn't open, visit https://vendo.run/auth/flipswitch manually.");
    process.exit(1);
  }

  const config = readConfig();
  config.authMode = "vendo";
  config.apiKey = result.apiKey;
  config.vendoUserId = result.userId;
  writeConfig(config);

  log.success("Logged in via Vendo.");

  // Auto-enable routing — no second command needed
  enableRouting();

  console.log();
  log.info("Restart any running Claude Code sessions and you're all set.");
}
