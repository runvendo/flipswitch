# flipswitch

Use Claude Code with any model. No Anthropic subscription needed.

```bash
npm install -g flipswitch
flipswitch        # sign in with Vendo
flipswitch on     # enable routing
```

Sign in with [Vendo](https://vendo.run), flip the switch, restart Claude Code. You're routed through Vendo with access to 400+ models via OpenRouter.

## Why

- **No Anthropic subscription required.** Claude Code's CLI is free to install. Flipswitch routes API calls through [Vendo](https://vendo.run) — you never need a Pro, Max, or Team plan.
- **Dead simple.** Sign in with Vendo, run `flipswitch on`, done. No config files to edit, no env vars to manage, no proxy servers.
- **Access 400+ models.** Remap Claude Code's model slots to any model on OpenRouter — GPT-4o, Gemini 2.5 Pro, DeepSeek, Llama, and more.
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
| `flipswitch model <slot> <id>` | Remap a model slot to any OpenRouter model |
| `flipswitch models` | Browse available models |
| `flipswitch key <key>` | Use your own OpenRouter key instead of Vendo |

## Model Remapping

By default, Claude Code uses the same Claude models via OpenRouter. You can remap any slot to a different model:

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
Yes, after `flipswitch on`, `flipswitch off`, or `flipswitch model`. Claude Code reads settings at startup.

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
