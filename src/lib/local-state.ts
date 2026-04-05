import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

interface LocalState {
  enabled: boolean;
  managedEnvVars: string[];
}

const FILE_NAME = ".flipswitch.json";

function getLocalPath(): string {
  return join(process.cwd(), FILE_NAME);
}

export function readLocalState(): LocalState | null {
  const p = getLocalPath();
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

export function writeLocalState(state: LocalState): void {
  const p = getLocalPath();
  const tmp = p + "." + randomBytes(4).toString("hex") + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n", "utf-8");
  renameSync(tmp, p);
}

export function removeLocalState(): void {
  const p = getLocalPath();
  if (existsSync(p)) unlinkSync(p);
}
