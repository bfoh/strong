# Topview MCP local setup

Registered server: `topview`.
Endpoint: `https://mcp.topview.ai/mcp`.
Transport: Streamable HTTP.
Local client: Codex CLI0.160.0; registration is in `~/.codex/config.toml`.

The endpoint was added with the official CLI. Existing server definitions were retained. OAuth support was detected and browser authorization flows were started. Installation and completed authorization are separate states; do not describe the account as connected until login succeeds. The browser callback waiters, including the retry after the user reported authorization, expired without saving credentials. The latest app-server verification reported `notLoggedIn` and zero available Topview tools. A fresh local login is required unless a later verified callback succeeds.

## Finish sign-in

In Codex or the IDE extension, open **Settings → MCP servers**, find `topview`, and select **Authenticate**. If the newly registered server is missing, restart the app or extension first. Complete Topview sign-in and approve the connection in the browser on this Mac. The app or extension should then show the authenticated connection.

Alternatively, start a fresh flow in a local terminal:

```sh
codex mcp login topview
```

Run this command on this Mac and use the browser it opens. The command waits for the local callback; leave it running until it reports login success. A chat authorization link works only while its original login listener is still running. Opening the authorization link on another device cannot reach this Mac's loopback listener. If the browser shows a localhost connection error, rerun the command for a fresh link and complete it while the command is running. Codex stores the OAuth credential through its credential mechanism. Do not paste passwords, tokens or callback codes into the project. To inspect the registered endpoint:

```sh
codex mcp get topview
```

Start a new Codex session if Topview tools are not listed in the current one. First verify a read-only capability, such as the available generation configuration or account credit balance; do not spend credits simply to test installation. Then use the custom `$strong-cinematic-production` skill for the Strong Properties task.

To remove the connection later, `codex mcp logout topview` removes stored OAuth credentials and `codex mcp remove topview` removes the definition. These commands are provided for reference and were not run.

Sources: [Topview's MCP setup](https://www.topview.ai/mcp), [official Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp), [official Codex MCP commands](https://learn.chatgpt.com/docs/developer-commands#codex-mcp).
