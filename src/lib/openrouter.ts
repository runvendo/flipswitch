import { OPENROUTER_BASE_URL, isVendoKey, type OpenRouterModel } from "../types.js";

export interface KeyInfo {
  usage: number;
  limit: number | null;
  limitRemaining: number | null;
  isFreeTier: boolean;
}

/**
 * Validate a direct OpenRouter API key.
 * Not used for Vendo proxy keys — those are trusted at issuance
 * and validated at request time by the proxy (401/402).
 */
export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/v1/auth/key`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch usage and credit info for an OpenRouter API key.
 * Returns null for Vendo proxy keys (use the Vendo dashboard instead).
 */
export async function getKeyInfo(key: string): Promise<KeyInfo | null> {
  if (isVendoKey(key)) {
    return null;
  }
  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/v1/auth/key`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const { data } = (await res.json()) as {
      data: {
        usage: number;
        limit: number | null;
        limit_remaining: number | null;
        is_free_tier: boolean;
      };
    };
    return {
      usage: data.usage,
      limit: data.limit,
      limitRemaining: data.limit_remaining,
      isFreeTier: data.is_free_tier,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch available models from OpenRouter.
 */
export async function listModels(): Promise<OpenRouterModel[]> {
  const res = await fetch(`${OPENROUTER_BASE_URL}/v1/models`);
  if (!res.ok) {
    throw new Error(`Failed to fetch models: ${res.status}`);
  }
  const data = (await res.json()) as { data: OpenRouterModel[] };
  return data.data;
}

/**
 * Check if a model ID exists on OpenRouter.
 */
export async function modelExists(modelId: string): Promise<boolean> {
  try {
    const models = await listModels();
    return models.some((m) => m.id === modelId);
  } catch {
    return false;
  }
}
