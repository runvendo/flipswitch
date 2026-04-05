import chalk from "chalk";
import { listModels } from "../lib/openrouter.js";
import { readConfig } from "../lib/config.js";
import * as log from "../lib/logger.js";

// Curated list of popular models to highlight
const FEATURED_PREFIXES = [
  "anthropic/",
  "openai/",
  "google/",
  "meta-llama/",
  "deepseek/",
  "mistralai/",
];

export async function modelsCommand(options: { all?: boolean }): Promise<void> {
  const spin = log.spinner("Fetching models from OpenRouter...");

  let models;
  try {
    models = await listModels();
  } catch (e: any) {
    spin.fail(`Failed to fetch models: ${e.message}`);
    process.exit(1);
  }

  spin.stop();

  const config = readConfig();
  const mappedIds = new Set(Object.values(config.modelMappings).filter(Boolean));

  // Filter to featured models unless --all
  const filtered = options.all
    ? models
    : models.filter((m) => FEATURED_PREFIXES.some((p) => m.id.startsWith(p)));

  // Sort by provider, then name
  filtered.sort((a, b) => a.id.localeCompare(b.id));

  log.header(`Models (${filtered.length} of ${models.length} total)`);
  if (!options.all) {
    log.dim("Showing popular models. Use --all to see all models.");
  }
  console.log();

  for (const model of filtered) {
    const isMapped = mappedIds.has(model.id);
    const id = isMapped ? chalk.cyan(model.id) : model.id;
    const promptPrice = parseFloat(model.pricing?.prompt ?? "0") * 1_000_000;
    const completionPrice =
      parseFloat(model.pricing?.completion ?? "0") * 1_000_000;
    const pricing = chalk.dim(
      `$${promptPrice.toFixed(2)}/$${completionPrice.toFixed(2)} per 1M tokens`
    );
    const mapped = isMapped ? chalk.green(" (mapped)") : "";

    console.log(`  ${id}${mapped}`);
    console.log(`    ${pricing}  ${chalk.dim(`ctx: ${(model.context_length ?? 0).toLocaleString()}`)}`);
  }

  console.log();
  log.info("Usage: flipswitch model <sonnet|opus|haiku> <model-id>");
}
