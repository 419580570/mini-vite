import connect from "connect";
import type * as http from "node:http";
import { InlineConfig, resolveConfig, ResolvedConfig } from "../config";
import { DEFAULT_DEV_PORT } from "../constants";
import { CommonServerOptions, httpServerStart } from "../http";
import { printServerUrls } from "../logger";
import { resolveServerUrls } from "../util";
import { openBrowser as _openBrowser } from "./openBrowser";
// import { resolveHttpServer } from "../http";

export interface ServerOptions extends CommonServerOptions {
  hmr?: any;
  watch?: any;
  middlewareMode?: boolean | "html" | "ssr";
  base?: string;
  fs?: any;
  origin?: string;
  preTransformRequests?: boolean;
  sourcemapIgnoreList?:
    | false
    | ((sourcePath: string, sourcemapPath: string) => boolean);
  force?: boolean;
}

export interface ViteDevServer {
  config: ResolvedConfig;
  middlewares: connect.Server;
  httpServer: http.Server | null;
  listen(port?: number, isRestart?: boolean): Promise<ViteDevServer>;
  openBrowser(): void;
  resolvedUrls: ResolvedServerUrls | null;
  printUrls(): void;
}

export interface ResolvedServerUrls {
  local: string[];
  network: string[];
}

export async function createServer(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig, "serve");
  const middlewares = connect();
  const { createServer } = await import("node:http");
  const httpServer = createServer(middlewares);

  const server: ViteDevServer = {
    config,
    middlewares,
    httpServer,
    resolvedUrls: null,
    async listen(port?: number, isRestart?: boolean) {
      await startServer(server, port);
      server.resolvedUrls = await resolveServerUrls(
        httpServer,
        config.server!,
        config
      );
      config.server!.open && server.openBrowser();
      return server;
    },
    openBrowser() {
      const options = server.config.server!;
      const url = server.resolvedUrls?.local[0];
      if (url) {
        const path =
          typeof options.open === "string"
            ? new URL(options.open, url).href
            : url;
        _openBrowser(path, true);
      }
    },
    printUrls() {
      if (server.resolvedUrls) {
        printServerUrls(
          server.resolvedUrls,
          config.server!.host,
        );
      }
    },
  };
  return server;
}

async function startServer(server: ViteDevServer, inlinePort?: number) {
  const httpServer = server.httpServer;
  if (!httpServer) {
    throw new Error("Cannot call server.listen in middleware mode.");
  }

  const options = server.config.server!;
  const port = inlinePort ?? options.port ?? DEFAULT_DEV_PORT;
  const hostname = options.host === true ? undefined : "localhost";

  await httpServerStart(httpServer, {
    port,
    host: hostname,
  });
}
