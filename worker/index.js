// Cloudflare Workers entry point for the RED POLY web app.
// Static Expo web files are served from dist/ via the ASSETS binding.
// This Worker does not store accounts, learning progress, or API secrets.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/health") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response(null, {
          status: 405,
          headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" },
        });
      }
      return new Response(
        request.method === "HEAD"
          ? null
          : JSON.stringify({ status: "ok", service: "red-poly" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // No unimplemented API path should be mistaken for a working backend.
    if (pathname.startsWith("/api/")) {
      return Response.json(
        { error: "not_found" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return env.ASSETS.fetch(request);
  },
};
