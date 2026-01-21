import path from "path";
import { fileURLToPath } from "url";
import { detectConvexUrl } from "../utils/detectConvexUrl.js";
import { openBrowser } from "../utils/openBrowser.js";

interface AdminOptions {
  url?: string;
  port: string;
  demo?: boolean;
  open: boolean;
}

/**
 * Launch the Convex CMS admin panel.
 *
 * This command starts a pre-built TanStack Start server that serves the
 * admin UI. The server reads CONVEX_URL from the environment at runtime,
 * allowing a single build to connect to any Convex deployment.
 */
export async function adminCommand(options: AdminOptions): Promise<void> {
  // 1. Resolve Convex URL
  const convexUrl = options.url ?? (await detectConvexUrl());

  if (!convexUrl && !options.demo) {
    console.error("Error: Could not detect Convex deployment URL.");
    console.error("");
    console.error("Please provide the URL using one of these methods:");
    console.error("  --url <url>           Pass URL directly");
    console.error("  CONVEX_URL=<url>      Set environment variable");
    console.error("  .env.local            Add CONVEX_URL to env file");
    console.error("");
    console.error("Or run in demo mode with mock data:");
    console.error("  npx convex-cms admin --demo");
    process.exit(1);
  }

  // 2. Set environment variables for the server
  if (convexUrl) {
    process.env.CONVEX_URL = convexUrl;
  }
  process.env.AUTH_MODE = options.demo ? "demo" : "production";
  process.env.PORT = options.port;
  process.env.NITRO_PORT = options.port;

  // 3. Find the pre-built admin assets
  // When compiled, this file is at dist/cli/commands/admin.js
  // We need to go up 3 levels to reach admin-dist at the package root
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const adminDistPath = path.resolve(__dirname, "../../../admin-dist");

  // 4. Log startup info
  console.log("");
  console.log("  Convex CMS Admin");
  console.log("  ----------------");
  if (convexUrl) {
    console.log(`  Convex URL: ${convexUrl}`);
  } else {
    console.log("  Convex URL: Not configured (demo mode)");
  }
  console.log(`  Port:       ${options.port}`);
  console.log(`  Auth Mode:  ${options.demo ? "demo" : "production"}`);
  console.log("");

  // 5. Start the server
  const serverEntry = path.join(adminDistPath, "server", "index.mjs");

  try {
    // Dynamically import the server to start it
    await import(serverEntry);

    // 6. Open browser after server starts
    const adminUrl = `http://localhost:${options.port}`;
    if (options.open) {
      // Give the server a moment to start before opening browser
      setTimeout(() => {
        openBrowser(adminUrl);
      }, 1000);
    }

    console.log(`  Admin panel starting at ${adminUrl}`);
    console.log("");
    console.log("  Press Ctrl+C to stop");
    console.log("");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Cannot find module")
    ) {
      console.error("Error: Admin build not found.");
      console.error("");
      console.error(
        "The pre-built admin UI is missing. This usually means:"
      );
      console.error("  - You're running from source (not the npm package)");
      console.error("  - The package wasn't built correctly");
      console.error("");
      console.error("If developing locally, run:");
      console.error("  cd admin && npm run dev");
    } else {
      console.error("Error starting admin server:", error);
    }
    process.exit(1);
  }
}
