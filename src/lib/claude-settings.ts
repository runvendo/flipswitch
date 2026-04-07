import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { ClaudeSettings } from "../types.js";

const GLOBAL_CLAUDE_DIR = join(homedir(), ".claude");
const GLOBAL_SETTINGS_PATH = join(GLOBAL_CLAUDE_DIR, "settings.json");

function resolveSettingsPath(local?: boolean): string {
  if (local) {
    return join(process.cwd(), ".claude", "settings.json");
  }
  return GLOBAL_SETTINGS_PATH;
}

export function getSettingsPath(local?: boolean): string {
  return resolveSettingsPath(local);
}

function readSettingsAt(path: string): ClaudeSettings {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

/**
 * Fix known schema issues that cause Claude Code to reject the entire file.
 * e.g. enabledPlugins must be a record, not an array.
 */
function sanitizeSettings(settings: ClaudeSettings): ClaudeSettings {
  if (Array.isArray(settings.enabledPlugins)) {
    const record: Record<string, boolean> = {};
    for (const plugin of settings.enabledPlugins as string[]) {
      record[plugin] = true;
    }
    settings.enabledPlugins = record;
  }
  return settings;
}

function writeSettingsAt(path: string, settings: ClaudeSettings): void {
  const dir = join(path, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  sanitizeSettings(settings);
  const tmpPath = path + "." + randomBytes(4).toString("hex") + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
  renameSync(tmpPath, path);
}

export function readSettings(local?: boolean): ClaudeSettings {
  return readSettingsAt(resolveSettingsPath(local));
}

/**
 * Merge env vars into the settings.json env block.
 * Preserves all existing keys outside of env.
 */
export function setEnvVars(vars: Record<string, string>, local?: boolean): void {
  const path = resolveSettingsPath(local);
  const settings = readSettingsAt(path);
  settings.env = { ...(settings.env ?? {}), ...vars };
  writeSettingsAt(path, settings);
}

/**
 * Remove specific env var keys from settings.json.
 * Removes the env block entirely if it becomes empty.
 */
export function removeEnvVars(keys: string[], local?: boolean): void {
  const path = resolveSettingsPath(local);
  const settings = readSettingsAt(path);
  if (!settings.env) return;

  for (const key of keys) {
    delete settings.env[key];
  }

  if (Object.keys(settings.env).length === 0) {
    delete settings.env;
  }

  writeSettingsAt(path, settings);
}

/**
 * Get current env vars from settings.json.
 */
export function getEnvVars(local?: boolean): Record<string, string> {
  const settings = readSettingsAt(resolveSettingsPath(local));
  return settings.env ?? {};
}
