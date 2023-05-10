import { ViteDevServer } from "..";
import * as http from "node:http";
import { isJSRequest, unwrapId } from "../../util";
import { isCSSRequest } from "../../plugins/css";
import { transformRequest } from "../transformRequest";
import { send } from "../send";

const knownIgnoreList = new Set(["/", "/favicon.ico"]);

export function transformMiddleware(server: ViteDevServer) {
  return async function viteTransformMiddleware(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: (err?: any) => void
  ) {
    if (req.method !== "GET" || knownIgnoreList.has(req.url!)) {
      return next();
    }

    let url: string = req.url!;

    if (isJSRequest(url) || isCSSRequest(url)) {
      // Strip valid id prefix.
      url = unwrapId(url);
      const result = await transformRequest(url, server);
      if (result) {
        return send(req, res, result, isCSSRequest(url) ? "css" : "js", {
          headers: server.config.server.headers,
        });
      }
    }
  };
}
