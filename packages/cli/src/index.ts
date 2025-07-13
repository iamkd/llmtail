#!/usr/bin/env node

import { spawn } from "node:child_process";
import { startServer } from "@llmtail/core";
import { Chalk } from "chalk";
import { Command } from "commander";

const chalk = new Chalk();
const program = new Command();

program
  .name("llmtail")
  .description(
    "Collect logs from any process and browser console, save them to a file, and make your LLM agent tail them when needed.",
  )
  .version("0.1.1");

program
  .command("start")
  .argument("[command...]", "Command to run")
  .description("Start the llmtail server and log the child process output")
  .option("-o, --output <file>", "Log output file path")
  .action((childArg, options) => {
    const logFilePath = options.output;

    const { writeLog, closeServer } = startServer({
      logFilePath,
      onError: (err) => {
        console.error(
          `${chalk.bgRed.white(" llmtail ")} encountered an error:`,
          err,
        );
      },
      onReady: ({ hostname, port }) => {
        console.log(
          `${chalk.bgBlue.white(" llmtail ")} is running on ${chalk.underline(`http://${hostname}:${port}`)} and proxying stdio/browser log output to ${chalk.bold.underline(logFilePath)}`,
        );
      },
    });

    // Spawn the command with shell
    const childProcess = spawn(childArg.join(" "), {
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
    });

    // Pipe stdout to both process.stdout and the file
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

    // Handle process completion
    childProcess.on("close", (code) => {
      closeServer();
      process.exit(code || 0);
    });

    // Handle errors
    childProcess.on("error", (err) => {
      console.error(`Failed to start command: ${err}`);
      closeServer();
      process.exit(1);
    });
  });

program.parse();
