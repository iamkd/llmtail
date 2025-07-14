import { dirname } from "node:path";
import { inspect } from "node:util";
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

export async function startServer({
  hostname = "localhost",
  port = 6284,
  logFilePath = "./llmtail.log",
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
      `${inspect({ timestamp: Date.now(), source, method, args: transformedArgs }, { colors: false, breakLength: Number.POSITIVE_INFINITY })}\n`,
    );
  }

  const server = express();

  server.use(cors());

  server.post("/console", bodyParser.json(), (req, res) => {
    const { body } = req;
    const arrayBody = Array.isArray(body) ? body : [body];

    for (const item of arrayBody) {
      if (item?.method && Array.isArray(item?.args)) {
        writeLog({ source: "browser", method: item.method, args: item.args });
      }
    }

    return res.status(200).json({ success: true });
  });

  try {
    const app = await new Promise<ReturnType<typeof server.listen>>(
      (resolve, reject) => {
        const result = server.listen(port, hostname);

        result.on("error", (err) => {
          reject(err);
        });

        result.on("listening", () => {
          resolve(result);
        });
      },
    );

    const closeServer = () => {
      output.end();
      app.close();
    };

    return {
      writeLog,
      closeServer,
    };
  } catch (error) {
    output.end();
    throw error;
  }
}
