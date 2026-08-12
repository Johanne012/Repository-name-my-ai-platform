/**
 * Minimal Vercel serverless entry.
 * Full Express app is built into this file during `pnpm run build` when esbuild succeeds.
 * This fallback keeps /health alive if the build output is missing.
 */
module.exports = function handler(req, res) {
  const url = req.url || "/";
  const path = url.split("?")[0];

  if (path === "/health" || path === "/api" || path === "/api/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      JSON.stringify({
        status: "ok",
        service: "agentic-ai",
        time: new Date().toISOString(),
        note: "minimal-handler",
      }),
    );
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: "Not found", path }));
};
