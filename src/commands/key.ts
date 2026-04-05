import { readConfig, writeConfig } from "../lib/config.js";
import { validateApiKey } from "../lib/openrouter.js";
import * as log from "../lib/logger.js";

export async function keyCommand(apiKey: string): Promise<void> {
  if (!apiKey.startsWith("sk-or-")) {
    log.error("Invalid key format. OpenRouter keys start with 'sk-or-'.");
    process.exit(1);
  }

  const spin = log.spinner("Validating API key with OpenRouter...");

  const valid = await validateApiKey(apiKey);
  if (!valid) {
    spin.fail("API key is invalid or could not be verified.");
    process.exit(1);
  }

  spin.succeed("API key validated.");

  const config = readConfig();
  config.authMode = "direct";
  config.apiKey = apiKey;
  config.vendoUserId = null;
  writeConfig(config);

  log.success("API key stored.");
  log.info("Run `flipswitch on` to start routing Claude Code through OpenRouter.");
}
