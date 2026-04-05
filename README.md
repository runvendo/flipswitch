# flipswitch

Use Claude Code with any model. No Anthropic subscription needed.

```bash
npm install -g flipswitch
flipswitch
```

That's it. Your browser opens, you sign in with [Vendo](https://vendo.run), and Claude Code is ready to go. Restart Claude Code and you're routed through OpenRouter with access to 400+ models.

## Why

- **No Anthropic subscription required.** Claude Code's CLI is free to install. Flipswitch routes all API calls through [OpenRouter](https://openrouter.ai) — you never need a Pro, Max, or Team plan.
- **One command setup.** Run `flipswitch`, sign in, done. No config files to edit, no env vars to manage, no proxy servers.
- **Access 400+ models.** Remap Claude Code's model slots to any model on OpenRouter — GPT-4o, Gemini 2.5 Pro, DeepSeek, Llama, and more.
- **Pay as you go.** With Vendo, you get a managed API key with built-in spending limits. No surprise bills.

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

### Run `flipswitch`

```bash
$ flipswitch

  Welcome to Flipswitch
  Use Claude Code with any model. No Anthropic subscription needed.
  Powered by Vendo (https://vendo.run)

  Opening Vendo in your browser...

  Logged in via Vendo.

  Flipswitch ON
  Claude Code will now route through OpenRouter.
  Restart any running Claude Code sessions and you're all set.
```

That's the entire setup. One command, one browser sign-in, restart Claude Code.

### Already have an OpenRouter key?

If you already have an OpenRouter API key, you can use it directly:

```bash
flipswitch key sk-or-v1-your-key
```

This validates the key, stores it, and enables routing automatically.

## Commands

| Command | Description |
|---|---|
| `flipswitch` | Sign in with Vendo and get started (default) |
| `flipswitch login` | Sign in with Vendo |
| `flipswitch logout` | Sign out and disable routing |
| `flipswitch on` | Re-enable routing |
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

No proxy server, no background process, no shell profile modifications. All existing settings (permissions, hooks, plugins) are preserved. `flipswitch off` removes only the keys it set.

## FAQ

**Do I need an Anthropic subscription?**
No. Flipswitch bypasses Anthropic entirely. You only need the free Claude Code CLI and a Vendo account (or your own OpenRouter key).

**Do I need to restart Claude Code?**
Yes, after `flipswitch`, `flipswitch off`, or `flipswitch model`. Claude Code reads settings at startup.

**What does Vendo do?**
[Vendo](https://vendo.run) provisions you a managed OpenRouter API key with spending limits. You sign in once and flipswitch handles the rest. No OpenRouter account needed.

**Can I use my own OpenRouter key instead?**
Yes — run `flipswitch key sk-or-v1-your-key`. But Vendo is easier since you don't need to create an OpenRouter account or manage API keys yourself.

**What about rate limits?**
Anthropic's rate limits don't apply. OpenRouter has its own [rate limits](https://openrouter.ai/docs/api/limits) based on your tier.

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
