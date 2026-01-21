#!/usr/bin/env node
import { Command } from "commander";
import { adminCommand } from "./commands/admin.js";

const program = new Command();

program
  .name("convex-cms")
  .description("Convex CMS CLI - Headless CMS built on Convex")
  .version("0.0.1");

program
  .command("admin")
  .description("Launch the Convex CMS admin panel")
  .option("--url <url>", "Convex deployment URL")
  .option("--port <port>", "Port to serve admin on", "3000")
  .option("--demo", "Run in demo mode with mock authentication")
  .option("--no-open", "Do not open browser automatically")
  .action(adminCommand);

program.parse();
