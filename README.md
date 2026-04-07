<p align="center">
  <img src="assets/banner-option-a.png" alt="flipswitch by Vendo" width="600" />
</p>

<p align="center">Use Claude Code with any model. No Anthropic subscription needed.</p>

```bash
npm install -g flipswitch
flipswitch        # sign in with Vendo
flipswitch on     # enable routing
```

Sign in with [Vendo](https://vendo.run), flip the switch, restart Claude Code. You're routed through Vendo with access to 300+ models via OpenRouter.

## Why

- **No Anthropic subscription required.** Claude Code's CLI is free to install. Flipswitch routes API calls through [Vendo](https://vendo.run) — you never need a Pro, Max, or Team plan.
- **Dead simple.** Sign in with Vendo, run `flipswitch on`, done. No config files to edit, no env vars to manage, no proxy servers.
- **Access 300+ models.** Remap Claude Code's model slots to any model on OpenRouter — Gemini, GPT, DeepSeek, Llama, Devstral, and more.
- **Profiles.** Switch between curated open-source model presets — `max`, `speed`, `budget`, or `free`.
- **Pay as you go.** With Vendo, you get a managed OpenRouter API key with built-in credit limits. No surprise bills.

## Install

```bash
# npm
npm install -g flipswitch

# Homebrew
brew tap vendodev/tap
brew install flipswitch
```

Requires Node.js 18+.

## Getting Started

### Sign in with Vendo

```bash
$ flipswitch

  Welcome to Flipswitch
  Use Claude Code with any model. No Anthropic subscription needed.
  Powered by Vendo (https://vendo.run)

  Opening Vendo in your browser...
  Logged in via Vendo.
  Run `flipswitch on` to start routing Claude Code through Vendo.
```

### Enable routing

```bash
$ flipswitch on

  Flipswitch ON
  Claude Code will now route through Vendo.
  Restart any running Claude Code sessions for changes to take effect.
```

Restart Claude Code and you're all set.

### Already have an OpenRouter key?

If you already have an OpenRouter API key, you can skip Vendo:

```bash
flipswitch key sk-or-v1-your-key
flipswitch on
```

## Commands

| Command | Description |
|---|---|
| `flipswitch` | Sign in with Vendo (default) |
| `flipswitch login` | Sign in with Vendo |
| `flipswitch logout` | Sign out and disable routing |
| `flipswitch on` | Enable OpenRouter routing |
| `flipswitch off` | Disable routing, revert to direct Anthropic |
| `flipswitch status` | Show current configuration |
| `flipswitch profile <name>` | Apply a preset model profile |
| `flipswitch model <slot> <id>` | Remap a model slot to any OpenRouter model |
| `flipswitch models` | Browse available models |
| `flipswitch key <key>` | Use your own OpenRouter key instead of Vendo |

## Profiles

Switch all three model slots at once with a single command. All profiles use open-source models:

```bash
flipswitch profile max      # open-source frontier
flipswitch profile speed    # fast iteration
flipswitch profile budget   # cheapest that still codes well
flipswitch profile free     # zero cost, rate-limited
flipswitch profile default  # reset to standard Claude models
```

| Profile | Sonnet slot | Opus slot | Haiku slot | Cost |
|---------|-------------|-----------|------------|------|
| **max** | MiniMax M2.5 (80% SWE-bench) | GLM-5 (78% SWE-bench) | Qwen3 Coder (480B MoE) | $0.22–$2.30/M |
| **speed** | DeepSeek V3.2 | Qwen 3.6 Plus (1M ctx) | Gemma 4 31B | $0.14–$1/M |
| **budget** | Qwen3 Coder Next | DeepSeek V3.2 | Devstral Small | $0.10–$0.75/M |
| **free** | Qwen3 Coder | Qwen 3.6 Plus (1M ctx) | Nemotron 3 Super (262K) | $0 |

Free models are subsidized by OpenRouter and community inference providers — genuinely $0, no credit card needed. Rate limits: ~20 req/min, ~200 req/day.

Profiles set all three slots at once. You can still override individual slots with `flipswitch model` after applying a profile.

### How do these compare to Claude?

In [a real-world test of 33 models](https://akitaonrails.com/en/2026/04/05/testing-llms-open-source-and-commercial-can-anyone-beat-claude-opus/), only 4 produced working code — Claude Opus, Claude Sonnet, GLM-5, and GLM-5.1. The rest hallucinated APIs that don't exist. MiniMax M2.5 scores 80% on SWE-bench (nearly tied with Opus at 81%) but still invented fake methods in practice.

Open-source models handle ~80% of routine coding — single-file edits, well-known frameworks, quick iterations. They struggle with long agentic chains, niche libraries, and multi-file refactors.

See **[docs/open-source-models.md](docs/open-source-models.md)** for the full breakdown: tier list, what goes wrong, cost per session, and every model's real-world track record.

## Model Remapping

You can also remap individual slots to any of the 300+ models on OpenRouter:

```bash
# Route Sonnet requests to Gemini 2.5 Pro
flipswitch model sonnet google/gemini-2.5-pro

# Route Haiku requests to a cheaper model
flipswitch model haiku deepseek/deepseek-v3.2

# See what's available
flipswitch models

# Reset a slot back to default
flipswitch model sonnet --reset
```

Slots: `sonnet`, `opus`, `haiku`.

## How It Works

Flipswitch writes env vars to `~/.claude/settings.json`, Claude Code's [official config mechanism](https://code.claude.com/docs/en/settings):

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://openrouter.ai/api",
    "ANTHROPIC_AUTH_TOKEN": "sk-or-v1-...",
    "ANTHROPIC_API_KEY": ""
  }
}
```

Both Vendo and direct key users route through OpenRouter's Anthropic-compatible API. No background process, no proxy server, no shell profile modifications. All existing settings (permissions, hooks, plugins) are preserved. `flipswitch off` removes only the keys it set.

## FAQ

**Do I need an Anthropic subscription?**
No. Flipswitch bypasses Anthropic entirely. You only need the free Claude Code CLI and a Vendo account (or your own OpenRouter key).

**Do I need to restart Claude Code?**
Yes, after `flipswitch on`, `flipswitch off`, `flipswitch profile`, or `flipswitch model`. Claude Code reads settings at startup.

**What does Vendo do?**
[Vendo](https://vendo.run) provisions a managed OpenRouter API key with built-in credit limits. You sign in once, buy credits on Vendo, and flipswitch handles the rest. No OpenRouter account needed.

**Can I use my own OpenRouter key instead?**
Yes — run `flipswitch key sk-or-v1-your-key`. This routes directly to OpenRouter, bypassing Vendo.

**What about rate limits?**
Anthropic's rate limits don't apply since requests don't go to Anthropic.

**Is this safe?**
Yes. Flipswitch uses Claude Code's documented env var override feature. It makes atomic file writes to prevent corruption and tracks which keys it owns.

## Development

```bash
git clone https://github.com/vendodev/flipswitch
cd flipswitch
npm install
npm run build
npm test
./bin/flipswitch --help
```

## License

MIT
