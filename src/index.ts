#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { readConfig } from "./lib/config.js";
import { keyCommand } from "./commands/key.js";
import { onCommand } from "./commands/on.js";
import { offCommand } from "./commands/off.js";
import { statusCommand } from "./commands/status.js";
import { modelCommand } from "./commands/model.js";
import { modelsCommand } from "./commands/models.js";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";

const program = new Command();

program
  .name("flipswitch")
  .description("Route Claude Code through OpenRouter with one command")
  .version("0.1.0")
  .action(async () => {
    // Default action: if no subcommand is given, guide the user
    const config = readConfig();

    if (config.enabled && config.apiKey) {
      // Already set up — show status
      await statusCommand();
      return;
    }

    if (config.apiKey && !config.enabled) {
      // Has a key but not enabled — just turn it on
      await onCommand();
      return;
    }

    // No key configured — start the Vendo login flow
    console.log();
    console.log(chalk.bold("  Welcome to Flipswitch"));
    console.log(chalk.dim("  Use Claude Code with any model. No Anthropic subscription needed."));
    console.log(chalk.dim("  Powered by Vendo (https://vendo.run)"));
    console.log();

    await loginCommand();
  });

program
  .command("login")
  .description("Sign in with Vendo to get started")
  .action(loginCommand);

program
  .command("logout")
  .description("Sign out and disable routing")
  .action(logoutCommand);

program
  .command("on")
  .description("Enable OpenRouter routing for Claude Code")
  .action(onCommand);

program
  .command("off")
  .description("Disable routing, revert to direct Anthropic")
  .action(offCommand);

program
  .command("status")
  .description("Show current flipswitch configuration")
  .action(statusCommand);

program
  .command("model <slot> [model-id]")
  .description("Remap a model slot (sonnet, opus, haiku) to an OpenRouter model")
  .option("--reset", "Remove the custom mapping for this slot")
  .action(modelCommand);

program
  .command("models")
  .description("List available models on OpenRouter")
  .option("--all", "Show all models, not just popular ones")
  .action(modelsCommand);

program
  .command("key <api-key>")
  .description("Use your own OpenRouter API key instead of Vendo")
  .action(keyCommand);

program.parse();
