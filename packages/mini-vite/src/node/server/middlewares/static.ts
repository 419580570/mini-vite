import { ViteDevServer } from "..";
import sirv from "sirv";
import * as http from "node:http";
import { cleanUrl } from "../../util";
import path from "node:path";

export function serveStaticMiddleware(dir: string, server: ViteDevServer) {
  const serve = sirv(dir, { dev: true });

  return function viteServeStaticMiddleware(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: (err?: any) => void
  ) {
    const cleanedUrl = cleanUrl(req.url!);
    if (cleanedUrl.endsWith("/") || path.extname(cleanedUrl) === "html") {
      next();
    }
    serve(req, res, next);
  };
}
