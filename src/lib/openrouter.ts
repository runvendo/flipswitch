import { OPENROUTER_BASE_URL, type OpenRouterModel } from "../types.js";

/**
 * Validate an OpenRouter API key by making a lightweight request.
 * Returns true if the key is valid.
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
