/**
 * HTTP Route Registration
 *
 * This file demonstrates how to mount CMS HTTP handlers in the parent app.
 * Convex components cannot define their own HTTP routes - they must be
 * mounted by the parent application.
 *
 * @example
 * ```typescript
 * // If the CMS component exposed HTTP handlers, you would mount them like:
 * import { httpRouter } from "convex/server";
 * import { cms } from "./cms";
 *
 * const http = httpRouter();
 *
 * // Mount CMS webhook handler for external integrations
 * http.route({
 *   path: "/cms/webhook",
 *   method: "POST",
 *   handler: cms.api.http.webhook,
 * });
 *
 * // Mount CMS preview handler for content previews
 * http.route({
 *   path: "/cms/preview/{entryId}",
 *   method: "GET",
 *   handler: cms.api.http.preview,
 * });
 *
 * export default http;
 * ```
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * Health check endpoint for monitoring.
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "convex-cms-example",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

/**
 * Example webhook endpoint for external integrations.
 *
 * In a real app, this would handle webhooks from:
 * - Content delivery networks (CDN) for cache invalidation
 * - Search engines for re-indexing
 * - External publishing platforms
 */
http.route({
  path: "/webhook/content-updated",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    try {
      const body = await request.json();

      // Validate webhook signature (in production, use a proper secret)
      const signature = request.headers.get("X-Webhook-Signature");
      if (!signature) {
        return new Response(
          JSON.stringify({ error: "Missing signature" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Process the webhook
      console.log("[Webhook] Content updated:", body);

      // In a real app, you might:
      // - Invalidate CDN cache
      // - Trigger a rebuild of static pages
      // - Update search indexes
      // - Send notifications

      return new Response(
        JSON.stringify({ received: true, timestamp: Date.now() }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("[Webhook] Error processing:", error);
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Example endpoint to get published content by slug.
 *
 * This demonstrates how you might expose a public API
 * for fetching content without authentication.
 */
http.route({
  path: "/api/content/{contentType}/{slug}",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    // Extract path parameters
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const contentType = pathParts[2]; // api/content/{contentType}/{slug}
    const slug = pathParts[3];

    if (!contentType || !slug) {
      return new Response(
        JSON.stringify({ error: "Missing contentType or slug" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get locale from query param or Accept-Language header
    const locale =
      url.searchParams.get("locale") ||
      request.headers.get("Accept-Language")?.split(",")[0] ||
      "en-US";

    // In a real implementation, you would query the CMS here
    // This is a placeholder showing the pattern
    return new Response(
      JSON.stringify({
        message: "Content API endpoint",
        contentType,
        slug,
        locale,
        note: "In production, this would return actual content from the CMS",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  }),
});

export default http;
