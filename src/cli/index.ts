#!/usr/bin/env node
import { Command } from "commander";
import { adminCommand } from "./commands/admin.js";
import { initCommand } from "./commands/init.js";

const program = new Command();

program
  .name("convex-cms")
  .description("Convex CMS CLI - Headless CMS built on Convex")
  .version("0.0.1");

program
  .command("init")
  .description("Initialize CMS admin API in your Convex project")
  .option("-f, --force", "Overwrite existing files")
  .option(
    "-t, --template <template>",
    "Schema template (blog, docs, landing, blank)"
  )
  .action(initCommand);

program
  .command("admin")
  .description("Launch the Convex CMS admin panel")
  .option("--url <url>", "Convex deployment URL")
  .option("--port <port>", "Port to serve admin on", "3000")
  .option("--demo", "Run in demo mode with mock authentication")
  .option("--no-open", "Do not open browser automatically")
  .action(adminCommand);

program.parse();
