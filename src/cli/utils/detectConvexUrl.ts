import fs from "fs";
import path from "path";

/**
 * Detects the Convex deployment URL from various sources.
 *
 * Priority order:
 * 1. CONVEX_URL environment variable
 * 2. VITE_CONVEX_URL environment variable
 * 3. .env.local file in current directory
 * 4. .env file in current directory
 *
 * @returns The detected Convex URL or null if not found
 */
export async function detectConvexUrl(): Promise<string | null> {
  // Check environment variables first
  if (process.env.CONVEX_URL) {
    return process.env.CONVEX_URL;
  }

  if (process.env.VITE_CONVEX_URL) {
    return process.env.VITE_CONVEX_URL;
  }

  // Try to read from env files in the current working directory
  const envFiles = [".env.local", ".env"];

  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);

    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");

        // Look for CONVEX_URL or VITE_CONVEX_URL
        const patterns = [
          /^CONVEX_URL=["']?([^"'\n\r]+)["']?/m,
          /^VITE_CONVEX_URL=["']?([^"'\n\r]+)["']?/m,
        ];

        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match?.[1]) {
            return match[1].trim();
          }
        }
      } catch {
        // Ignore read errors, continue to next file
      }
    }
  }

  return null;
}
