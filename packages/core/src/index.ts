import { dirname } from "node:path";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { createWriteStream, existsSync, mkdirSync } from "fs-extra";
import stripAnsi from "strip-ansi";

type StartServerOptions = {
  hostname?: string;
  port?: number;
  logFilePath?: string;
  onError?: (error: Error) => void;
  onReady?: (args: { hostname: string; port: number }) => void;
};

type WriteLogArgs = {
  // biome-ignore lint/suspicious/noExplicitAny: args can be any type
  args: any[];
  source: "cli" | "browser";
  method: string;
};

export function startServer({
  hostname = "localhost",
  port = 6284,
  logFilePath = "./llmtail.log",
  onError,
  onReady,
}: StartServerOptions = {}) {
  // Ensure output directory exists
  const outputDir = dirname(logFilePath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const output = createWriteStream(logFilePath, { flags: "a" });

  function writeLog({ args, source, method }: WriteLogArgs) {
    const transformedArgs = args.map((arg) => {
      if (typeof arg === "string") {
        return stripAnsi(arg)
          .replace(/[\u{0080}-\u{FFFF}]/gu, "")
          .trim();
      }
      return arg;
    });
    output.write(
      `${JSON.stringify({ timestamp: Date.now(), source, method, args: transformedArgs })}\n`,
    );
  }

  const server = express();

  server.use(cors());

  server.post("/console", bodyParser.json(), (req, res) => {
    const { body } = req;

    if (body?.method && Array.isArray(body?.args)) {
      writeLog({ source: "browser", method: body.method, args: body.args });
      return res.status(200).json({ success: true });
    }

    return res
      .status(400)
      .json({ success: false, error: "Invalid request body" });
  });

  const app = server.listen(port, hostname, (error) => {
    if (error) {
      output.end();
      onError?.(error);
    } else {
      onReady?.({ hostname, port });
    }
  });

  function closeServer() {
    app.close();
    output.end();
  }

  return { writeLog, closeServer };
}
