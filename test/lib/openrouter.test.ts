import { describe, it, expect, beforeEach, vi } from "vitest";
import type { OpenRouterModel } from "../../src/types.js";

const BASE_URL = "https://openrouter.ai/api";

const { validateApiKey, listModels, modelExists } = await import(
  "../../src/lib/openrouter.js"
);

function makeMockModel(overrides: Partial<OpenRouterModel> = {}): OpenRouterModel {
  return {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    pricing: { prompt: "0.000005", completion: "0.000015" },
    context_length: 128000,
    ...overrides,
  };
}

function mockFetchResponse(body: unknown, ok: boolean, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("openrouter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("validateApiKey", () => {
    it("returns true when the API key is valid (200 response)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockFetchResponse({}, true, 200)
      );

      const result = await validateApiKey("sk-or-v1-valid");

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/v1/auth/key`, {
        headers: { Authorization: "Bearer sk-or-v1-valid" },
      });
    });

    it("returns false when the API key is invalid (401 response)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockFetchResponse({ error: "Unauthorized" }, false, 401)
      );

      const result = await validateApiKey("sk-or-v1-invalid");

      expect(result).toBe(false);
    });

    it("returns false on network error", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network failure"));

      const result = await validateApiKey("sk-or-v1-any");

      expect(result).toBe(false);
    });

});

  describe("listModels", () => {
    it("returns parsed model list on success", async () => {
      const models: OpenRouterModel[] = [
        makeMockModel({ id: "openai/gpt-4o", name: "GPT-4o" }),
        makeMockModel({ id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" }),
      ];

      vi.mocked(fetch).mockResolvedValueOnce(
        mockFetchResponse({ data: models }, true, 200)
      );

      const result = await listModels();

      expect(result).toEqual(models);
      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/v1/models`);
    });

    it("throws an error when the response is not ok", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockFetchResponse({ error: "Service Unavailable" }, false, 503)
      );

      await expect(listModels()).rejects.toThrow("Failed to fetch models: 503");
    });
  });

  describe("modelExists", () => {
    it("returns true when the model id is found in the list", async () => {
      const models: OpenRouterModel[] = [
        makeMockModel({ id: "google/gemini-2.5-pro" }),
        makeMockModel({ id: "openai/gpt-4o" }),
      ];

      vi.mocked(fetch).mockResolvedValueOnce(
        mockFetchResponse({ data: models }, true, 200)
      );

      const result = await modelExists("google/gemini-2.5-pro");

      expect(result).toBe(true);
    });

    it("returns false when the model id is not found in the list", async () => {
      const models: OpenRouterModel[] = [
        makeMockModel({ id: "openai/gpt-4o" }),
      ];

      vi.mocked(fetch).mockResolvedValueOnce(
        mockFetchResponse({ data: models }, true, 200)
      );

      const result = await modelExists("does/not-exist");

      expect(result).toBe(false);
    });

    it("returns false when listModels throws due to a fetch error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockFetchResponse({}, false, 500)
      );

      const result = await modelExists("openai/gpt-4o");

      expect(result).toBe(false);
    });
  });
});
