import { readConfig, writeConfig } from "../lib/config.js";
import { setEnvVars } from "../lib/claude-settings.js";
import { writeLocalState } from "../lib/local-state.js";
import { validateApiKey } from "../lib/openrouter.js";
import {
  OPENROUTER_BASE_URL,
  VENDO_PROXY_URL,
  MODEL_ENV_VARS,
  isVendoKey,
  type ModelSlot,
} from "../types.js";
import * as log from "../lib/logger.js";

/**
 * Core logic to enable routing. Used by `on` command.
 * Vendo users route through the Vendo proxy; direct key users route through OpenRouter.
 */
export function enableRouting(options?: { local?: boolean }): boolean {
  const config = readConfig();
  const local = options?.local;

  if (!config.apiKey) {
    return false;
  }

  // Vendo users use the proxy base_url from the exchange response.
  // Fall back to VENDO_PROXY_URL for pre-update configs with vendo keys.
  // Direct key users fall back to the OpenRouter API.
  const baseUrl = config.baseUrl
    ?? (isVendoKey(config.apiKey) ? VENDO_PROXY_URL : OPENROUTER_BASE_URL);

  // Build the env vars to set.
  // ANTHROPIC_API_KEY is the primary auth mechanism (x-api-key header).
  // ANTHROPIC_AUTH_TOKEN is also set for the Authorization: Bearer header.
  // Both are needed because Claude Code may validate AUTH_TOKEN as an OAuth
  // token against Anthropic's servers, while API_KEY is used purely for requests.
  // DISABLE_TELEMETRY prevents Claude Code from calling Anthropic telemetry endpoints.
  const envVars: Record<string, string> = {
    ANTHROPIC_BASE_URL: baseUrl,
    ANTHROPIC_API_KEY: config.apiKey,
    ANTHROPIC_AUTH_TOKEN: config.apiKey,
    DISABLE_TELEMETRY: "true",
    DISABLE_COST_WARNINGS: "true",
  };

  const managedKeys = [
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "DISABLE_TELEMETRY",
    "DISABLE_COST_WARNINGS",
  ];

  // Add model mappings if configured
  for (const [slot, modelId] of Object.entries(config.modelMappings)) {
    if (modelId) {
      const envVar = MODEL_ENV_VARS[slot as ModelSlot];
      envVars[envVar] = modelId;
      managedKeys.push(envVar);
    }
  }

  try {
    // Write to settings.json (local or global)
    setEnvVars(envVars, local);

    if (local) {
      // Track locally in .flipswitch.json
      writeLocalState({ enabled: true, managedEnvVars: managedKeys });
    } else {
      // Track globally in ~/.flipswitch/config.json
      config.enabled = true;
      config.managedEnvVars = managedKeys;
      writeConfig(config);
    }
  } catch (e: any) {
    log.error(`Failed to write settings: ${e.message}`);
    return false;
  }

  return true;
}

export async function onCommand(options?: { local?: boolean }): Promise<void> {
  const config = readConfig();

  if (!config.apiKey) {
    log.error("No API key configured.");
    log.info(
      "Run `flipswitch` to get started with Vendo, or `flipswitch key <key>` to use your own OpenRouter key."
    );
    process.exit(1);
  }

  // Validate the key before enabling.
  // Vendo proxy keys are trusted — they were issued by the exchange endpoint
  // and the proxy will return 401/402 at request time if invalid.
  if (!isVendoKey(config.apiKey)) {
    const spin = log.spinner("Validating API key...");
    const valid = await validateApiKey(config.apiKey);
    if (!valid) {
      spin.fail("API key is invalid or expired.");
      log.info(
        "Run `flipswitch login` to get a new key, or `flipswitch key <key>` to set a valid OpenRouter key."
      );
      process.exit(1);
    }
    spin.succeed("API key valid");
  }

  const ok = enableRouting(options);
  if (!ok) {
    log.error("Failed to enable routing.");
    process.exit(1);
  }

  const provider = config.authMode === "vendo" ? "Vendo" : "OpenRouter";
  log.header("Flipswitch ON");
  if (options?.local) {
    log.success(`Claude Code will route through ${provider} in this project.`);
  } else {
    log.success(`Claude Code will now route through ${provider}.`);
  }
  log.info(
    "Restart any running Claude Code sessions for changes to take effect."
  );
}
