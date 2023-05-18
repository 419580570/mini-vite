import history from "connect-history-api-fallback";
import fs from "node:fs";
import path from "node:path";

export function htmlFallbackMiddleware(
  root: string,
  spaFallback: boolean
): any {
  // return function viteHtmlFallbackMiddleware(
  //   req: http.IncomingMessage,
  //   res: http.ServerResponse,
  //   next: (err?: any) => void
  // ) {
  //   return history()(req, res, next);
  // };

  return history({
    rewrites: [
      {
        from: /\/$/,
        to({ parsedUrl, request }: any) {
          const rewritten =
            decodeURIComponent(parsedUrl.pathname) + "index.html";

          if (fs.existsSync(path.join(root, rewritten))) {
            return rewritten;
          }

          return spaFallback ? `/index.html` : request.url;
        },
      },
    ],
  });
}
