import chalk from "chalk";
import { readConfig } from "../lib/config.js";
import { getKeyInfo } from "../lib/openrouter.js";
import { VENDO_BASE_URL, isVendoKey } from "../types.js";
import * as log from "../lib/logger.js";

async function getVendoBalance(apiKey: string): Promise<number | null> {
  try {
    const res = await fetch(`${VENDO_BASE_URL}/api/cli/balance`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { balance_usd: number };
    return data.balance_usd;
  } catch {
    return null;
  }
}

export async function usageCommand(): Promise<void> {
  const config = readConfig();

  if (!config.apiKey) {
    log.error("No API key configured. Run `flipswitch login` or `flipswitch key <key>` first.");
    process.exit(1);
  }

  if (isVendoKey(config.apiKey)) {
    const spin = log.spinner("Fetching balance...");
    const balance = await getVendoBalance(config.apiKey);
    spin.stop();

    log.header("Flipswitch Usage");
    console.log();

    if (balance != null) {
      const low = balance < 1;
      const balanceStr = low
        ? chalk.yellow(`$${balance.toFixed(2)}`)
        : chalk.green(`$${balance.toFixed(2)}`);
      log.label("Balance:  ", balanceStr);
    } else {
      log.warn("Could not fetch balance.");
    }

    log.dim(`  Manage billing → ${VENDO_BASE_URL}/settings/billing`);
    console.log();
    return;
  }

  const spin = log.spinner("Fetching usage...");
  const keyInfo = await getKeyInfo(config.apiKey);
  spin.stop();

  if (!keyInfo) {
    log.error("Could not fetch usage info from OpenRouter.");
    process.exit(1);
  }

  log.header("Flipswitch Usage");
  console.log();

  log.label("Usage:    ", `$${keyInfo.usage.toFixed(2)}`);

  if (keyInfo.limit != null && keyInfo.limitRemaining != null) {
    const remaining = `$${keyInfo.limitRemaining.toFixed(2)}`;
    const limit = `$${keyInfo.limit.toFixed(2)}`;
    const low = keyInfo.limitRemaining < 1;
    const creditStr = low
      ? chalk.yellow(remaining) + chalk.dim(` / ${limit} limit`)
      : chalk.green(remaining) + chalk.dim(` / ${limit} limit`);
    log.label("Credits:  ", creditStr);
  }

  console.log();
}
