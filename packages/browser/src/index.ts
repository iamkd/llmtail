const consoleMethodsToPatch = [
  "log",
  "warn",
  "error",
  "info",
  "debug",
] as const;

type PatchConsoleOptions = {
  port?: number;
};

export function patchConsole({ port = 6284 }: PatchConsoleOptions = {}) {
  if (typeof console === "undefined") {
    throw new Error("Console is not available in this environment");
  }

  if (typeof window === "undefined") {
    // Do not patch in non-browser environments (e.g. SSR, RSC, or Node.js).
    // Everything else should be piped using the CLI tool.
    return;
  }

  for (const method of consoleMethodsToPatch) {
    const originalMethod = console[method];

    // biome-ignore lint/suspicious/noExplicitAny: Patching console methods
    console[method] = (...args: any[]) => {
      fetch(`http://localhost:${port}/console`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method,
          args,
        }),
      }).catch(() => {});

      return originalMethod.apply(console, args);
    };
  }
}
