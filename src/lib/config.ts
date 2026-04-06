import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import type { FlipswitchConfig } from "../types.js";

const CONFIG_DIR = join(homedir(), ".flipswitch");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

function defaultConfig(): FlipswitchConfig {
  return {
    version: 1,
    authMode: null,
    apiKey: null,
    vendoUserId: null,
    enabled: false,
    modelMappings: {},
    activeProfile: null,
    managedEnvVars: [],
  };
}

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function readConfig(): FlipswitchConfig {
  if (!existsSync(CONFIG_PATH)) {
    return defaultConfig();
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return { ...defaultConfig(), ...JSON.parse(raw) };
  } catch {
    return defaultConfig();
  }
}

export function writeConfig(config: FlipswitchConfig): void {
  ensureDir();
  // Atomic write: write to temp file, then rename
  const tmpPath = CONFIG_PATH + "." + randomBytes(4).toString("hex") + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(config, null, 2) + "\n", {
    encoding: "utf-8",
    mode: 0o600,
  });
  renameSync(tmpPath, CONFIG_PATH);
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
