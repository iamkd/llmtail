import { configure as configureStringify } from "safe-stable-stringify";

const consoleMethodsToPatch = [
  "log",
  "warn",
  "error",
  "info",
  "debug",
  "trace",
] as const;

type ConsoleMethod = (typeof consoleMethodsToPatch)[number];

export interface PatchConsoleOptions {
  /** Full endpoint URL; overrides `port` if given. */
  endpoint?: string;
  /** Default localhost port if `endpoint` is omitted. */
  port?: number;
  /** Max attempts for fetch transport (network OR 5xx error). */
  retryAttempts?: number;
  /** ms between retries. */
  retryInterval?: number;
  /** Disable patching entirely. */
  disabled?: boolean;
  /** Max object depth when serialising. */
  maxDepth?: number;
  /** Max chars per string when serialising. */
  maxStringLength?: number;
  /** Flush queue every N ms (min 100 ms). */
  flushInterval?: number;
  /** Flush once queue hits this size. */
  batchSize?: number;
}

const globalKey = "__consolePatchState__";

declare global {
  var __consolePatchState__: PatchState;
}

interface PatchState {
  patched: boolean;
  original: Record<ConsoleMethod, (...args: unknown[]) => void>;
  queue: unknown[];
  flushTimer: number | null;
  recursionDepth: number;
}

function getState(): PatchState {
  if (!(globalKey in globalThis)) {
    globalThis[globalKey] = {
      patched: false,
      original: {} as PatchState["original"],
      queue: [],
      flushTimer: null,
      recursionDepth: 0,
    };
  }
  return globalThis[globalKey];
}

function sendViaFetch(
  url: string,
  body: string,
  attempts: number,
  retryInterval: number,
): void {
  let tries = 0;

  function attempt() {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      ...(AbortSignal?.timeout ? { signal: AbortSignal.timeout(2_000) } : {}),
    })
      .then((res) => {
        if (!res.ok && tries < attempts) {
          tries++;
          setTimeout(attempt, retryInterval);
        }
      })
      .catch(() => {
        if (tries < attempts) {
          tries++;
          setTimeout(attempt, retryInterval);
        }
      });
  }

  attempt();
}

function flushQueue(
  options: Required<
    Pick<
      PatchConsoleOptions,
      | "port"
      | "retryAttempts"
      | "retryInterval"
      | "maxDepth"
      | "maxStringLength"
    >
  > &
    Pick<PatchConsoleOptions, "endpoint">,
) {
  const state = getState();
  if (!state.queue.length) return;

  const batch = state.queue.splice(0, state.queue.length);
  const body = JSON.stringify(batch);

  const url =
    options.endpoint ??
    `${location.protocol}//${location.hostname}:${options.port}/console`;

  sendViaFetch(url, body, options.retryAttempts, options.retryInterval);
}

export function patchConsole({
  endpoint,
  port = 6284,
  retryAttempts = 3,
  retryInterval = 500,
  disabled = false,
  maxDepth = 5,
  maxStringLength = 10_000,
  flushInterval = 500,
  batchSize = 20,
}: PatchConsoleOptions = {}): (() => void) | undefined {
  if (disabled || typeof window === "undefined") return;

  const state = getState();
  if (state.patched) return;

  const stringify = configureStringify({
    bigint: true,
    maximumDepth: maxDepth,
  });

  for (const method of consoleMethodsToPatch) {
    if (typeof console[method] !== "function") continue;

    state.original[method] = console[method];

    console[method] = (...args: unknown[]) => {
      const payload = {
        source: "browser",
        url: location.href,
        method,
        args: args.map((a) => stringify(a)),
        ts: Date.now(),
        ua: navigator.userAgent,
      };

      state.queue.push(payload);

      if (state.queue.length >= batchSize) {
        flushQueue({
          endpoint,
          port,
          retryAttempts,
          retryInterval,
          maxDepth,
          maxStringLength,
        });
      }

      // biome-ignore lint/suspicious/noExplicitAny: args can be any type
      return state.original[method].apply(console, args as any);
    };
  }

  state.flushTimer = window.setInterval(
    () => {
      flushQueue({
        endpoint,
        port,
        retryAttempts,
        retryInterval,
        maxDepth,
        maxStringLength,
      });
    },
    Math.max(100, flushInterval),
  );

  state.patched = true;

  return function unpatch() {
    if (!state.patched) return;

    for (const method of consoleMethodsToPatch) {
      if (state.original[method]) {
        console[method] = state.original[method];
      }
    }
    state.patched = false;
    if (state.flushTimer) {
      clearInterval(state.flushTimer);
    }
    state.queue.length = 0;
  };
}
