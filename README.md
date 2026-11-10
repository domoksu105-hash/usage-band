# usage-band

A one-line usage monitor drawn directly above the Claude Code prompt:

```
⏱ SESSION [████░░░░] 54% ↻2h00 | 📅 WEEK [██░░░░░░] 24% ↻4d17h | ☀ CONTEXT [█░░░░░░░] 14%
```

- **SESSION**: the 5-hour usage window, percent used and time until it resets.
- **WEEK**: the 7-day usage window, percent used and time until it resets.
- **CONTEXT**: how full the conversation's context window is, with a weather icon
  (under 50% ☀, 50–70% ☁, 70–85% ☂, 85% and over ⚡).

In the desktop app the row is one SVG (dark navy, 28px tall, 13px monospace, filled bars in
teal / green / light sky, dotted grey for the rest, orange past 80%). In a terminal the same row
is drawn with █ and ░. When the window narrows, the bars shrink first and then the ↻ times hide,
so it always stays on one line.

Figures are refreshed after every turn from the session's own usage reading. A value the session
has not reported shows as `—`; nothing is estimated. No costs are shown and no model is called.
Rate-limit windows are only reported on a Claude subscription.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install usage-band --marketplace domoksu105-hash/usage-band
```

Answer `y` to add the marketplace, then pick the user scope.

From a shell:

```
claude plugin install usage-band --marketplace domoksu105-hash/usage-band
```

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with
`domoksu105-hash/usage-band`, then **Add plugin**.

## License

MIT
