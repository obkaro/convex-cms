import open from "open";

/**
 * Opens a URL in the default browser.
 *
 * @param url - The URL to open
 */
export async function openBrowser(url: string): Promise<void> {
  try {
    await open(url);
  } catch (error) {
    // Silently fail if browser cannot be opened
    // The user can still manually navigate to the URL
    console.warn(`Could not open browser automatically. Please visit: ${url}`);
  }
}
