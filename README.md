# flipswitch

Route Claude Code through OpenRouter with one command. No proxy server, no background processes — just a single CLI that flips a switch.

```bash
npm install -g flipswitch
flipswitch key sk-or-v1-your-key-here
flipswitch on
# restart Claude Code — done
```

## Why

- **No Anthropic subscription required.** Claude Code's CLI is free. Flipswitch routes API calls through OpenRouter so you pay only for what you use.
- **Access 400+ models.** Remap Claude Code's model slots to any OpenRouter model — GPT-4o, Gemini 2.5 Pro, DeepSeek, Llama, and more.
- **Centralized billing.** Teams can use `flipswitch login` to authenticate via [Vendo](https://vendo.run) and get a managed API key with spending limits.
- **Zero overhead.** No proxy server, no background daemon, no ports. Flipswitch writes env vars to `~/.claude/settings.json` — Claude Code's official config mechanism.

## Install

```bash
# npm
npm install -g flipswitch

# Homebrew
brew tap vendodev/tap
brew install flipswitch
```

Requires Node.js 18+.

## Quick Start

### Option A: Use your own OpenRouter key

1. Get an API key at [openrouter.ai/keys](https://openrouter.ai/keys)
2. Run:
   ```bash
   flipswitch key sk-or-v1-your-key
   flipswitch on
   ```
3. Restart Claude Code. All API calls now go through OpenRouter.

### Option B: Sign in via Vendo (managed key)

```bash
flipswitch login
flipswitch on
```

Your browser opens, you authenticate, and Vendo provisions an OpenRouter key with spending limits billed to your team.

## Commands

| Command | Description |
|---|---|
| `flipswitch key <key>` | Set your OpenRouter API key |
| `flipswitch on` | Enable OpenRouter routing |
| `flipswitch off` | Disable routing, revert to direct Anthropic |
| `flipswitch status` | Show current configuration |
| `flipswitch model <slot> <id>` | Remap a model slot to any OpenRouter model |
| `flipswitch models` | List available OpenRouter models |
| `flipswitch login` | Authenticate via Vendo for a managed key |
| `flipswitch logout` | Clear credentials and disable routing |

## Model Remapping

By default, Claude Code's model requests pass through to the same Claude models on OpenRouter. You can remap individual slots:

```bash
# Route Sonnet requests to Gemini 2.5 Pro
flipswitch model sonnet google/gemini-2.5-pro

# Route Haiku requests to a cheaper model
flipswitch model haiku meta-llama/llama-4-scout

# See what's available
flipswitch models

# Reset a slot back to default
flipswitch model sonnet --reset
```

Slots: `sonnet`, `opus`, `haiku`. These map to Claude Code's `ANTHROPIC_DEFAULT_*_MODEL` env vars.

## How It Works

Flipswitch writes three env vars to `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://openrouter.ai/api",
    "ANTHROPIC_AUTH_TOKEN": "sk-or-v1-...",
    "ANTHROPIC_API_KEY": ""
  }
}
```

This is Claude Code's [official configuration mechanism](https://code.claude.com/docs/en/settings) for environment variables. All existing settings (permissions, hooks, plugins) are preserved — flipswitch only touches the `env` block.

`flipswitch off` removes only the keys it set. It tracks ownership via `~/.flipswitch/config.json` so it never deletes env vars you configured manually.

## Config Files

| File | Purpose |
|---|---|
| `~/.flipswitch/config.json` | Flipswitch state (auth mode, API key, model mappings, managed env var list) |
| `~/.claude/settings.json` | Claude Code settings — flipswitch writes/removes the `env` block |

## FAQ

**Do I need an Anthropic subscription?**
No. When `ANTHROPIC_BASE_URL` is set, Claude Code bypasses Anthropic entirely. You only need the free CLI (`npm install -g @anthropic-ai/claude-code`) and an OpenRouter key.

**Do I need to restart Claude Code?**
Yes, after running `flipswitch on`, `flipswitch off`, or `flipswitch model`. Claude Code reads `settings.json` at startup.

**Is this safe?**
Flipswitch uses Claude Code's documented env var override feature. It makes atomic file writes to prevent corruption and tracks which keys it owns so `off` never removes your manual settings.

**What about rate limits?**
Anthropic's rate limits don't apply since requests go to OpenRouter. OpenRouter has its own [rate limits](https://openrouter.ai/docs/api/limits) based on your account tier.

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
