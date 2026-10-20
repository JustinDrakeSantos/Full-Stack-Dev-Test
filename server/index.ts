import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { recommend } from "./ai.js";
const root = resolve("dist");
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  if (
    (req.url === "/api/recommend" || req.url === "/api/recommend/demo") &&
    req.method === "POST"
  ) {
    res.setHeader("Content-Type", "application/json");
    const chunks: Buffer[] = [];
    let bytes = 0;
    try {
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 12000) {
          res.writeHead(413);
          res.end(JSON.stringify({ error: "Inspection too large" }));
          return;
        }
        chunks.push(chunk);
      }
      const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const result = await recommend(
        input,
        req.url === "/api/recommend/demo" ? { mode: "demo" } : undefined,
      );
      res.end(JSON.stringify(result));
    } catch (error) {
      const invalid =
        error instanceof SyntaxError ||
        (error as { name?: string }).name === "ZodError";
      res.writeHead(invalid ? 400 : 503);
      res.end(
        JSON.stringify({
          error: invalid
            ? "Invalid inspection or AI response. Review inputs or use manual selection."
            : "AI unavailable or timed out. Check server configuration; manual estimating remains available.",
        }),
      );
    }
    return;
  }
  if (req.url?.startsWith("/api/")) {
    res.writeHead(404);
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const path = resolve(
      root,
      "." + decodeURIComponent((req.url ?? "/").split("?")[0]),
    );
    if (!path.startsWith(root + "/") && path !== root) throw Error();
    let data: Buffer;
    let extension = extname(path);
    try {
      data = await readFile(path);
    } catch {
      if (extension) throw Error();
      data = await readFile(resolve(root, "index.html"));
      extension = ".html";
    }
    res.setHeader(
      "Content-Type",
      (
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
        } as Record<string, string>
      )[extension] ?? "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.requestTimeout = 25000;
server.headersTimeout = 10000;
server.listen(Number(process.env.PORT ?? 3001), "127.0.0.1", () =>
  console.log(
    "FieldQuote server listening on localhost; default AI mode: demo",
  ),
);
