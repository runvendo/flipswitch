# Open-Source Models in Claude Code: What Actually Works

> Last updated: April 2026. Model landscape changes fast — this doc reflects real-world testing and developer consensus, not just benchmarks.

## TL;DR

Open-source models can handle ~80% of routine coding tasks in Claude Code. They fall apart on long agentic chains, niche libraries, and security-critical code. The biggest problem isn't intelligence — it's **knowledge**. Models hallucinate APIs that don't exist.

Only **4 out of 33 models** produced working code in the most thorough real-world test to date. Claude Opus/Sonnet and GLM-5/5.1 were the only ones that didn't invent fake methods.

---

## The Honest Tier List

Based on real-world testing with Claude Code, not just benchmarks.

### Tier 1 — Actually works end-to-end

| Model | OpenRouter ID | What it costs | What people say |
|-------|--------------|---------------|-----------------|
| **Claude Opus 4.6** | (default) | $5/$25 per 1M tokens | Gold standard. 30 tests, correct APIs, 16 min. |
| **Claude Sonnet 4.6** | (default) | $3/$15 per 1M tokens | Same quality as Opus for most tasks. 40% cheaper. |

### Tier 2 — Works, with caveats

| Model | OpenRouter ID | What it costs | What people say |
|-------|--------------|---------------|-----------------|
| **GLM-5.1** | `z-ai/glm-5` | $0.72/$2.30 per 1M tokens | 24 tests, correct APIs, slightly slower. 89% cheaper than Opus. Reddit: "high in ratings but really bad for IaC." Inconsistent across domains. |
| **GLM-5** | `z-ai/glm-5` | $0.72/$2.30 per 1M tokens | Working code, 7 tests, missing features. Best open-source value for complex tasks. |

### Tier 3 — Good benchmarks, real-world gaps

| Model | OpenRouter ID | What it costs | What people say |
|-------|--------------|---------------|-----------------|
| **MiniMax M2.5** | `minimax/minimax-m2.5` | $0.30/$1.20 per 1M tokens | 80.2% SWE-bench (nearly ties Opus), but hallucinated APIs in the Rails test. First open model to beat Sonnet on OpenHands tests. 13x cheaper than Opus. Great for greenfield apps. |
| **DeepSeek V3.2** | `deepseek/deepseek-v3.2` | $0.27/$0.42 per 1M tokens | ~90% of frontier quality at 1/50th cost. Invented a `RubyLLM::Client` class that doesn't exist. Slowest cloud model (60 min, no prompt caching). Everyone's daily driver for non-critical work. |
| **Kimi K2.5** | `moonshotai/kimi-k2.5` | $0.38/$1.72 per 1M tokens | Reddit: "Between Sonnet 4.5 and Opus 4.5. Not as good as either 4.6. Workable but you notice the weakness." Invented fake methods in testing. |

### Tier 4 — Specialized / budget

| Model | OpenRouter ID | What it costs | What people say |
|-------|--------------|---------------|-----------------|
| **Qwen3 Coder** | `qwen/qwen3-coder` | $0.22/$1.00 per 1M tokens | 480B MoE, purpose-built for agentic coding. Better at tool use and function calling than raw code gen. "Coder" models sometimes perform worse than general models on agentic workflows. |
| **Qwen 3.6 Plus** | `qwen/qwen3.6-plus` | Free (preview) | 1M context, strong reasoning. Currently free — may change. Good for the opus slot if you need big context. |
| **Devstral 2** | `mistralai/devstral-2512` | $0.40/$2.00 per 1M tokens | 123B dense (not MoE). "Better coherence on whole-repository tasks" due to dense architecture. 262K context. Ships with its own CLI agent. |
| **Devstral Small** | `mistralai/devstral-small` | $0.10/$0.30 per 1M tokens | 24B params. Runs on a single RTX 4090 or 32GB Mac. Good enough for simple edits and the haiku slot. |
| **Gemma 4 31B** | `google/gemma-4-31b-it` | $0.14/$0.40 per 1M tokens | Google's latest open-weight. Small and fast. Good for the haiku slot. |
| **Qwen3 Coder Next** | `qwen/qwen3-coder-next` | $0.12/$0.75 per 1M tokens | Budget coding model. Solid for simple tasks. |

### Free tier

| Model | OpenRouter ID | Context | Notes |
|-------|--------------|---------|-------|
| **Qwen3 Coder** | `qwen/qwen3-coder:free` | 262K | Best free coding model. |
| **Qwen 3.6 Plus** | `qwen/qwen3.6-plus:free` | 1M | Strong reasoning. Currently free as preview. |
| **Nemotron 3 Super** | `nvidia/nemotron-3-super-120b-a12b:free` | 262K | 120B MoE, tool support. |
| **Llama 3.3 70B** | `meta-llama/llama-3.3-70b-instruct:free` | 66K | Solid all-rounder. |
| **Gemma 3 27B** | `google/gemma-3-27b-it:free` | 131K | Vision support. |

Free models are genuinely $0 — subsidized by OpenRouter and community inference providers. No credit card required. Rate limits: ~20 req/min, ~200 req/day.

---

## What Actually Goes Wrong

### 1. API hallucination (the #1 problem)

8 out of 12 models that completed a real-world coding test **invented methods that don't exist**. Examples:

- DeepSeek V3.2 invented `RubyLLM::Client` (doesn't exist)
- Kimi K2.5 invented `add_message()` and `complete()` methods
- MiniMax M2.7 called `RubyLLM.chat(messages: [...])` with a wrong signature

This is worse with niche libraries and newer APIs. The model generates plausible-looking code that passes a vibe check but crashes at runtime.

### 2. "Coder" models can be worse for agentic tasks

Dedicated coding models (Qwen3 Coder, Qwen 2.5 Coder) sometimes score lower than general models on multi-step agentic workflows. The specialization helps with code completion but hurts with planning and tool use.

### 3. Distillation doesn't transfer knowledge

Claude-distilled models copy the coding style but miss the library API knowledge: "Style transferred but API knowledge didn't." It's binary recall — either in the weights or it isn't.

### 4. Free-tier gotchas

- Rate limits hit fast during long autonomous sessions
- Model availability changes — a model that was free last month may not be now
- Adding even $5 in credits to OpenRouter reduces throttling significantly
- Responses can be 4-6x slower during peak hours

---

## Where Open-Source Models Are Good Enough

- **Single-file edits** — refactoring, renaming, formatting
- **Well-known frameworks** — React, Express, Django, Rails basics
- **Code explanation** — understanding existing code, debugging obvious issues
- **Simple generation** — functions, classes, moderate complexity
- **Quick iterations** — rapid prototyping where you'll review everything anyway

## Where They Fall Apart

- **Long agentic chains** — multi-step, multi-file autonomous sessions
- **Niche/newer libraries** — anything the model hasn't seen enough in training
- **Security-critical code** — "plausible-but-wrong" edge cases
- **Complex architecture** — multi-file refactors, novel design decisions
- **Infrastructure code** — Reddit: GLM-5 is "really bad for IaC"

---

## Cost Comparison

What a typical Claude Code session costs across tiers (assuming ~500K tokens):

| Tier | Approx. cost per session | Trade-off |
|------|-------------------------|-----------|
| Claude Opus 4.6 | $7–15 | Works. Just works. |
| Claude Sonnet 4.6 | $4–9 | Handles 80%+ of what Opus does. |
| **max** profile (MiniMax/GLM) | $0.50–2 | Best open-source bet. May hallucinate on niche APIs. |
| **speed** profile (DeepSeek/Qwen) | $0.15–0.50 | Great for routine tasks. Check the output. |
| **budget** profile | $0.05–0.30 | Simple edits only. |
| **free** profile | $0 | Rate-limited. 80% of routine tasks. |

---

## The Bottom Line

The gap between Claude and open-source is **real but narrowing**. Benchmarks like SWE-bench don't tell the whole story — MiniMax M2.5 scores 80.2% (nearly tied with Opus at 80.8%) but still hallucinated in practice.

The scaffold (Claude Code itself, the tooling, the agent loop) matters more than the model weights. A 22-point swing from tooling vs ~1 point between frontier models.

**Recommendation:** Start with the `speed` or `max` profile. If something breaks or looks wrong, switch to default Claude for that task. Save Opus for the hard stuff.

---

## Sources

- [Testing 33 LLMs on a Real Rails Project (AkitaOnRails, Apr 2026)](https://akitaonrails.com/en/2026/04/05/testing-llms-open-source-and-commercial-can-anyone-beat-claude-opus/)
- [MiniMax M2.5: Open Weights Catch Up to Claude (OpenHands, Feb 2026)](https://openhands.dev/blog/minimax-m2-5-open-weights-models-catch-up-to-claude)
- [Best Open Source LLMs to Replace Claude (Bitdoze, 2026)](https://www.bitdoze.com/best-open-source-llms-claude-alternative/)
- [Every Model Ranked by Real Benchmarks (Morph, Mar 2026)](https://www.morphllm.com/best-ai-model-for-coding)
- [Claude Code Compatible Models (GitHub)](https://github.com/Alorse/cc-compatible-models)
- [Using Free OpenRouter Models with Claude Code (MindStudio)](https://www.mindstudio.ai/blog/open-router-free-models-claude-code-cost-reduction)
- [OpenRouter Rankings April 2026](https://www.digitalapplied.com/blog/openrouter-rankings-april-2026-top-ai-models-data)
- [GLM-5.1 vs Claude Opus (Serenities AI)](https://serenitiesai.com/articles/glm-5-1-zhipu-coding-benchmark-claude-opus-comparison-2026)
- [OpenRouter Free Models (Apr 2026)](https://costgoat.com/pricing/openrouter-free-models)
- [Using Claude Code with Open Models (ruflo wiki)](https://github.com/ruvnet/ruflo/wiki/Using-Claude-Code-with-Open-Models)
