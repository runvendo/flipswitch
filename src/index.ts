#!/usr/bin/env node
import { Command } from "commander";
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
  .version("0.1.0");

program
  .command("key <api-key>")
  .description("Set your OpenRouter API key directly")
  .action(keyCommand);

program
  .command("on")
  .description("Enable OpenRouter routing for Claude Code")
  .action(onCommand);

program
  .command("off")
  .description("Disable OpenRouter routing, revert to direct Anthropic")
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
  .description("List popular models available on OpenRouter")
  .option("--all", "Show all models, not just popular ones")
  .action(modelsCommand);

program
  .command("login")
  .description("Authenticate via Vendo to get a managed OpenRouter API key")
  .action(loginCommand);

program
  .command("logout")
  .description("Remove stored credentials and disable routing")
  .action(logoutCommand);

program.parse();
