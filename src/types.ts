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
  /** Currently active profile name, if any. */
  activeProfile: string | null;
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

export const VENDO_BASE_URL = process.env.VENDO_URL ?? "https://vendo.run";

// ── Profiles ────────────────────────────────────────────────────────────

export interface Profile {
  name: string;
  description: string;
  mappings: {
    sonnet: string;
    opus: string;
    haiku: string;
  };
  /** Estimated cost range per 1M tokens (input/output) for the primary slot. */
  costHint: string;
}

export const PROFILES: Record<string, Profile> = {
  max: {
    name: "max",
    description: "Open-source frontier — closest to Claude Opus for coding",
    mappings: {
      sonnet: "minimax/minimax-m2.5",
      opus: "z-ai/glm-5",
      haiku: "qwen/qwen3-coder",
    },
    costHint: "$0.22–$2.30/M tokens",
  },
  speed: {
    name: "speed",
    description: "Fast open-source models for rapid iteration",
    mappings: {
      sonnet: "deepseek/deepseek-v3.2",
      opus: "qwen/qwen3.6-plus",
      haiku: "google/gemma-4-31b-it",
    },
    costHint: "$0.14–$1/M tokens",
  },
  budget: {
    name: "budget",
    description: "Cheapest open-source models that still code well",
    mappings: {
      sonnet: "qwen/qwen3-coder-next",
      opus: "deepseek/deepseek-v3.2",
      haiku: "mistralai/devstral-small",
    },
    costHint: "$0.10–$0.75/M tokens",
  },
  free: {
    name: "free",
    description: "Zero cost, rate-limited (~20 req/min, ~200/day)",
    mappings: {
      sonnet: "qwen/qwen3-coder:free",
      opus: "qwen/qwen3.6-plus:free",
      haiku: "nvidia/nemotron-3-super-120b-a12b:free",
    },
    costHint: "$0",
  },
};
