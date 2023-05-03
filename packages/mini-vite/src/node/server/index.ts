import connect from "connect";
import type * as http from "node:http";
import { InlineConfig, resolveConfig, ResolvedConfig } from "../config";
import { DEFAULT_DEV_PORT } from "../constants";
import { CommonServerOptions, httpServerStart } from "../http";
import { printServerUrls } from "../logger";
import { resolveServerUrls } from "../util";
import { indexHtmlMiddleware } from "./middlewares/indexHtml";
import { serveStaticMiddleware } from "./middlewares/static";
import { openBrowser as _openBrowser } from "./openBrowser";
import { createPluginContainer } from "./pluginContainer";
import { initDepsOptimizer } from "../optimizer/optimizer";
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
export interface ResolvedServerOptions extends ServerOptions {
  fs: Required<{
    strict?: boolean;
    allow?: string[];
    deny?: string[];
  }>;
  middlewareMode: boolean;
  sourcemapIgnoreList: Exclude<
    ServerOptions["sourcemapIgnoreList"],
    false | undefined
  >;
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
  const container = await createPluginContainer(config);
  

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
        printServerUrls(server.resolvedUrls, config.server!.host);
      }
    },
  };

  middlewares.use(serveStaticMiddleware(config.root, server));
  middlewares.use(indexHtmlMiddleware(server));

  let serverInited = false;
  let initingServer: Promise<void> | undefined;
  const initServer = async () => {
    if (serverInited) return;
    if (initingServer) return initingServer;
    initingServer = (async function () {
      await container.buildStart();
      initDepsOptimizer(config, server);
      initingServer = undefined;
      serverInited = true;
    })();
    return initingServer;
  };
  // 重写httpServer.listen方法，启动服务之前预编译
  const listen = httpServer.listen.bind(httpServer);
  httpServer.listen = (async (port: number, ...args: any[]) => {
    try {
      await initServer();
    } catch (e) {
      httpServer.emit("error", e);
      return;
    }
    return listen(port, ...args);
  }) as any;
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
