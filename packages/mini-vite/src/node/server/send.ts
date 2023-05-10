import type {
  IncomingMessage,
  OutgoingHttpHeaders,
  ServerResponse,
} from "node:http";
import type { SourceMap } from "rollup";

export interface SendOptions {
  etag?: string;
  cacheControl?: string;
  headers?: OutgoingHttpHeaders;
  map?: SourceMap | null;
}

const alias: Record<string, string | undefined> = {
  js: "application/javascript",
  css: "text/css",
  html: "text/html",
  json: "application/json",
};

export function send(
  req: IncomingMessage,
  res: ServerResponse,
  content: string | Buffer,
  type: string,
  options: SendOptions
) {
  if (res.writableEnded) {
    return;
  }
  res.setHeader("Content-Type", alias[type] || type);

  res.statusCode = 200;
  res.end(content);
}
