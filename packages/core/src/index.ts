import { createServer } from "node:http";
import { outputFile } from "fs-extra";

type StartServerOptions = {
  hostname?: string;
  port?: number;
  logFilePath?: string;
};

export function startServer({
  hostname = "localhost",
  port = 6284,
  logFilePath = "./llmtail.log",
}: StartServerOptions = {}) {
  const server = createServer((req, res) => {
    if (req.method === "POST" && req.url === "/console") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        console.log(`Received console log: ${body}`);
        outputFile(logFilePath, body, { flag: "a" });
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Console log received");
      });
    }
  });

  server.listen(hostname, port, () => {
    console.log(`llmtail server is running on http://${hostname}:${port}`);
  });
}
