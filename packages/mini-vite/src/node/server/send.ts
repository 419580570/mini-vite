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

  res.statusCode = 200;
  res.end(content);
}
