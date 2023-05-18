import { ViteDevServer } from "..";
import * as http from "node:http";
import path from "node:path";
import { cleanUrl, normalizePath } from "../../util";
import fs from "node:fs";
import { send } from "../send";
import { HtmlTagDescriptor, injectToHead } from "../../plugins/html";
import { CLIENT_PUBLIC_PATH } from "../../constants";

export function createDevHtmlTransformFn() {
  return (html: string): string => {
    const res = devHtmlHook(html);
    html = injectToHead(res.html, res.tags, true);
    return html;
  };
}

const devHtmlHook = (
  html: string
): {
  html: string;
  tags: HtmlTagDescriptor[];
} => {
  // const s = new MagicString(html);
  // await traverseHtml(html, node => {
  //   if(node.nodeName === 'script') {

  //   }

  //   if(node.nodeName === 'style' && node.childNodes.length) {

  //   }
  // });

  // html = s.toString();

  return {
    html,
    tags: [
      {
        tag: "script",
        attrs: {
          type: "module",
          src: path.posix.join("/", CLIENT_PUBLIC_PATH),
        },
        injectTo: "head-prepend",
      },
    ],
  };
};

export function indexHtmlMiddleware(server: ViteDevServer) {
  return function viteIndexHtmlMiddleware(
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
          html = server.transformIndexHtml(html);
          return send(req, res, html, "html", {
            headers: server.config.server.headers,
          });
        } catch (e) {
          return next(e);
        }
      }
    }
    next();
  };
}
