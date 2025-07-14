import { spawn } from "node:child_process";
import { startServer } from "@llmtail/core";

export type StartServerOptions = {
  hostname?: string;
  port?: number;
  outputFilePath: string;
  childCommand: string;
  onError?: (error: Error) => void;
};

export async function startChildCommandWithServer({
  hostname = "localhost",
  port = 6284,
  outputFilePath,
  childCommand,
  onError,
}: StartServerOptions) {
  const { writeLog, closeServer } = await startServer({
    hostname,
    port,
    logFilePath: outputFilePath,
  });

  // Spawn the command with improved options for seamless stdio handling
  const childProcess = spawn(childCommand, {
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
    // Keep color and formatting
    env: {
      ...process.env,
      FORCE_COLOR: "true",
      COLORTERM: process.env.COLORTERM || "truecolor",
    },
    // Enable detached mode for better signal handling
    detached: process.platform !== "win32", // Don't use detached on Windows
    windowsHide: false, // Show console window on Windows
  });

  // Pipe stdout to both process.stdout and the log file
  childProcess.stdout.on("data", (data) => {
    process.stdout.write(data);
    writeLog({
      source: "cli",
      method: "log",
      args: [data.toString()],
    });
  });

  // Also handle stderr
  childProcess.stderr.on("data", (data) => {
    process.stderr.write(data);
    writeLog({
      source: "cli",
      method: "log",
      args: [data.toString()],
    });
  });

  // Forward signals to child process for proper termination
  const forwardSignals = ["SIGINT", "SIGTERM", "SIGBREAK", "SIGHUP"] as const;
  forwardSignals.forEach((signal) => {
    process.on(signal, () => {
      if (process.platform !== "win32" && childProcess.pid) {
        // On non-Windows platforms, use negative PID to kill the process group
        process.kill(-childProcess.pid, signal);
      } else {
        childProcess.kill(signal);
      }
    });
  });

  // Handle process completion
  childProcess.on("close", (code) => {
    closeServer();
    process.exit(code || 0);
  });

  // Handle errors
  childProcess.on("error", (err) => {
    onError?.(err);
    closeServer();
    process.exit(1);
  });
}
