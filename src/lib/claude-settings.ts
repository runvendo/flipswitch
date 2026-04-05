import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import type { ClaudeSettings } from "../types.js";

const CLAUDE_DIR = join(homedir(), ".claude");
const SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");

export function getSettingsPath(): string {
  return SETTINGS_PATH;
}

export function readSettings(): ClaudeSettings {
  if (!existsSync(SETTINGS_PATH)) {
    return {};
  }
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeSettings(settings: ClaudeSettings): void {
  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
  }
  // Atomic write: write to temp file, then rename
  const tmpPath = SETTINGS_PATH + "." + randomBytes(4).toString("hex") + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
  renameSync(tmpPath, SETTINGS_PATH);
}

/**
 * Merge env vars into ~/.claude/settings.json's env block.
 * Preserves all existing keys outside of env.
 */
export function setEnvVars(vars: Record<string, string>): void {
  const settings = readSettings();
  settings.env = { ...(settings.env ?? {}), ...vars };
  writeSettings(settings);
}

/**
 * Remove specific env var keys from ~/.claude/settings.json.
 * Removes the env block entirely if it becomes empty.
 */
export function removeEnvVars(keys: string[]): void {
  const settings = readSettings();
  if (!settings.env) return;

  for (const key of keys) {
    delete settings.env[key];
  }

  // Clean up empty env block
  if (Object.keys(settings.env).length === 0) {
    delete settings.env;
  }

  writeSettings(settings);
}

/**
 * Get current env vars from settings.json.
 */
export function getEnvVars(): Record<string, string> {
  const settings = readSettings();
  return settings.env ?? {};
}
