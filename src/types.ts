export interface FlipswitchConfig {
  version: 1;
  authMode: "vendo" | "direct" | null;
  /** OpenRouter API key — provisioned by Vendo or provided directly by user. */
  apiKey: string | null;
  vendoUserId: string | null;
  enabled: boolean;
  modelMappings: {
    sonnet?: string;
    opus?: string;
    haiku?: string;
  };
  /** Tracks which env var keys flipswitch owns in ~/.claude/settings.json */
  managedEnvVars: string[];
}

export interface ClaudeSettings {
  env?: Record<string, string>;
  [key: string]: unknown;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
  context_length: number;
}

export type ModelSlot = "sonnet" | "opus" | "haiku";

export const MODEL_SLOTS: ModelSlot[] = ["sonnet", "opus", "haiku"];

export const MODEL_ENV_VARS: Record<ModelSlot, string> = {
  sonnet: "ANTHROPIC_DEFAULT_SONNET_MODEL",
  opus: "ANTHROPIC_DEFAULT_OPUS_MODEL",
  haiku: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
};

export const BASE_ENV_VARS = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
] as const;

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api";

export const VENDO_BASE_URL = "https://vendo.run";
