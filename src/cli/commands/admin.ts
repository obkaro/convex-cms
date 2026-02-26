import path from "path";
import fs from "fs";
import http from "http";
import { fileURLToPath } from "url";
import { detectConvexUrl } from "../utils/detectConvexUrl.js";
import { openBrowser } from "../utils/openBrowser.js";

interface AdminOptions {
  url?: string;
  port: string;
  demo?: boolean;
  open: boolean;
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".map": "application/json",
};

export async function adminCommand(options: AdminOptions): Promise<void> {
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

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const adminDistPath = path.resolve(__dirname, "../../../admin-dist");

  const indexHtmlPath = path.join(adminDistPath, "index.html");
  if (!fs.existsSync(indexHtmlPath)) {
    console.error("Error: Admin build not found.");
    console.error("");
    console.error("The pre-built admin UI is missing. This usually means:");
    console.error("  - You're running from source (not the npm package)");
    console.error("  - The package wasn't built correctly");
    console.error("");
    console.error("If developing locally, run:");
    console.error("  cd admin && pnpm dev");
    process.exit(1);
  }

  const cmsConfig = JSON.stringify({
    convexUrl: convexUrl || "",
    authMode: options.demo ? "demo" : "production",
  });

  const rawHtml = fs.readFileSync(indexHtmlPath, "utf-8");
  const injectedHtml = rawHtml.replace(
    "</head>",
    `<script>window.__CMS_CONFIG__=${cmsConfig};</script>\n</head>`,
  );

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

  const port = parseInt(options.port, 10);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const filePath = path.join(adminDistPath, url.pathname);

    if (
      url.pathname !== "/" &&
      fs.existsSync(filePath) &&
      fs.statSync(filePath).isFile()
    ) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    } else {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(injectedHtml);
    }
  });

  server.listen(port, () => {
    const adminUrl = `http://localhost:${port}`;
    console.log(`  Admin panel running at ${adminUrl}`);
    console.log("");
    console.log("  Press Ctrl+C to stop");
    console.log("");

    if (options.open) {
      openBrowser(adminUrl);
    }
  });
}
