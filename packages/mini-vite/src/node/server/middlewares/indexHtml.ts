import { ViteDevServer } from "..";
import * as http from "node:http";
import path from "node:path";
import { cleanUrl, normalizePath } from "../../util";
import fs from "node:fs";
import { send } from "../send";

export function indexHtmlMiddleware(server: ViteDevServer) {
  return async function viteIndexHtmlMiddleware(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: (err?: any) => void
  ) {
    const url = req.url && cleanUrl(req.url);
    if (url?.endsWith(".html")) {
      const filename = normalizePath(
        path.join(server.config.root, url.slice(1))
      );
      if (fs.existsSync(filename)) {
        try {
          let html = fs.readFileSync(filename, "utf-8");
          return send(req, res, html, "html", {
            headers: server.config.server.headers,
          });
        } catch (e) {
          return next(e);
        }
      }
    }
  };
}
