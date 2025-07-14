#!/usr/bin/env node

import { Chalk } from "chalk";
import { Command } from "commander";
import { startChildCommandWithServer } from ".";

const chalk = new Chalk();
const program = new Command();

program
  .name("llmtail")
  .description(
    "Collect logs from any process and browser console, save them to a file, and make your LLM agent tail them when needed.",
  )
  .version("0.2.0");

program
  .command("start")
  .argument("[command...]", "Command to run")
  .description("Start the llmtail server and log the child process output")
  .option("-o, --output [file]", "Log output file path", "./llmtail.log")
  .option("-p, --port [port]", "Port to run the server on", "6284")
  .option(
    "-h, --hostname [hostname]",
    "Hostname to run the server on",
    "localhost",
  )
  .action(async (childArg, options) => {
    const onError = (err: unknown) => {
      console.error(
        `${chalk.bgRed.white(" llmtail ")} encountered an error:`,
        err,
      );
    };

    try {
      const parsedPort = Number.parseInt(options.port, 10);

      if (Number.isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
        throw new Error("Invalid port number");
      }

      await startChildCommandWithServer({
        hostname: options.hostname,
        port: parsedPort,
        outputFilePath: options.output,
        childCommand: childArg.join(" "),
        onError,
      });

      console.log(
        `${chalk.bgBlue.white(" llmtail ")} is running on ${chalk.underline(`http://${options.hostname}:${parsedPort}`)} and proxying stdio/browser log output to ${chalk.bold.underline(options.output)}`,
      );
    } catch (error) {
      onError(error);
      process.exit(1);
    }
  });

program.parse();
