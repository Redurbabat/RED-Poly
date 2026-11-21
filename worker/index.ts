// Cloudflare Worker fuer die Expo-Webversion von RED POLY.
// Alle Lerninhalte und Fortschritte verbleiben im Browser / auf dem Geraet.
// Dies ist kein Benutzerkonto- oder Sync-Backend.

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;

    // Fuer Monitoring: kein API-Key, keine personenbezogenen Daten.
    if (pathname === "/api/health") {
      if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...jsonHeaders, Allow: "GET" },
        });
      }

      return new Response(JSON.stringify({ status: "ok", app: "RED POLY" }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    // Unbekannte API-URLs duerfen nicht versehentlich die SPA zurueckgeben.
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // Cloudflare liefert existierende Expo-Dateien standardmaessig direkt aus.
    return env.ASSETS.fetch(request);
  },
};
