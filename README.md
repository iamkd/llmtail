# llmtail

Combine browser and server logs into a single LLM-friendly format. Feed it into Claude Code so it can understand your app's behavior.

> [!WARNING]
> This is an early prototype that got killed by Cluade Code itself after a few weeks. It now supports starting servers from within itself and tapping into CLI outputs.

| Package                                                                                                                                                                          | Description                                                           |
| -------------                                                                                                                                                                        | --------------                                                                     |
| <a href="https://www.npmjs.com/package/@llmtail/cli"><img src="https://img.shields.io/npm/v/%40llmtail%2Fcli?label=%40llmtail%2Fcli" alt="LLMTail CLI on npm" /></a>                 | CLI Tool for capturing logs from your development server and browser. |
| <a href="https://www.npmjs.com/package/@llmtail/browser"><img src="https://img.shields.io/npm/v/%40llmtail%2Fbrowser?label=%40llmtail%2Fbrowser" alt="LLMTail Browser on npm" /></a> | Browser script for capturing logs from the browser.                   |
| <a href="https://www.npmjs.com/package/@llmtail/core"><img src="https://img.shields.io/npm/v/%40llmtail%2Fcore?label=%40llmtail%2Fcore" alt="LLMTail Core on npm" /></a>             | Core library that starts the server and writes the logs.              |


## Why?

*Hypothesis*: allowing agents like Claude Code to `tail` through simple, informative, and well-structured logs will improve their ability to debug their own changes and iterate on them.

Inspired by Armin Ronacher's talk: https://www.youtube.com/watch?v=nfOVgz_omlU.

## Setup

1. Install the CLI and the browser script (if you want to get browser logs as well):

   ```bash
   npm install -S @llmtail/cli @llmtail/browser
   ```

   or if you use `pnpm`:

   ```bash
   pnpm add @llmtail/cli @llmtail/browser
   ```

2. Update your dev script to use `llmtail`:

   ```bash
   llmtail start -o ./my.log -- <your-dev-command>
   ```

   For example, if you use Next.js, change your `package.json` dev script to:

   ```json
   "dev": "llmtail start -o ./my.log -- next dev --turbopack"
   ```

   This will start a server that captures console output and writes it to a log file.

3. (Optional, but recommended) Add the browser script to your app (depending on your setup, you might need to adjust the code):

   A nicer option is to add the script to the `<head>` of your HTML file so that logs are captured from the very beginning:
   ```html
   <head>
     <script src="https://unpkg.com/@llmtail/browser@latest/global"></script>
     <script>LLMTail.patchConsole();</script>
   </head>
   ```
   Another option is to import the script in your entry file (e.g. `index.tsx` or `App.tsx`), but this will only capture logs after the app is loaded:
  
   ```tsx
    import { patchConsole } from "@llmtail/browser";

    if (process.env.NODE_ENV !== 'production') {
      patchConsole();
    }
   ```

4. Add a prompt to your `CLAUDE.md` or use a different way to provide instructions (**I am still working on the right prompt, it definitely should be rewritten**):
    ```markdown
    ## Debugging
  
    When running a development server, both server and browser logs are aggregated into a single file located at `./my.log`. After each change, use `tail` to view a unified log file available at `./my.log`. Combine `tail` with `grep` to filter logs by keywords, such as `error` or `info`. To debug your changes, add `console.log` statements in your code, and then use `tail` with `grep` to view your own logs.
    ```

## TODO

- [x] Support port configuration
- [ ] Allow configuring the log format and filter out the noise
- [ ] Add a custom `tail` utility to better select logs (e.g. after a specific timestamp, or filter by log level)
- [ ] Multi-process support (run `llmtail` for many processes and merge logs)
- [ ] Support framework-specific logs and integrations for better context and DX (priority: React, Next.js, Vite)
- [ ] Provide frictionless setup for users (auto-append to `CLAUDE.md`, better CLI UX, etc.)
- [ ] Better README
