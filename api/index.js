/**
 * Vercel serverless entry (ESM — package.json has "type": "module").
 */
export default function handler(req, res) {
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
      }),
    );
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: "Not found", path }));
}
