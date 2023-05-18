import connect from "connect";
import type * as http from "node:http";
import chokidar from "chokidar";
import { InlineConfig, resolveConfig, ResolvedConfig } from "../config";
import { DEFAULT_DEV_PORT } from "../constants";
import { CommonServerOptions, httpServerStart } from "../http";
import { printServerUrls } from "../logger";
import { normalizePath, resolveServerUrls } from "../util";
import {
  createDevHtmlTransformFn,
  indexHtmlMiddleware,
} from "./middlewares/indexHtml";
import { serveStaticMiddleware } from "./middlewares/static";
import { openBrowser as _openBrowser } from "./openBrowser";
import { createPluginContainer, PluginContainer } from "./pluginContainer";
import { initDepsOptimizer } from "../optimizer/optimizer";
import { transformMiddleware } from "./middlewares/transform";
import { ModuleGraph } from "./moduleGraph";
import { htmlFallbackMiddleware } from "./middlewares/htmlFallback";
import { createWebSocketServer } from "./ws";
import { handleHMRUpdate } from "./hmr";
import { WebSocketServer } from "./ws";
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
  ws: WebSocketServer;
  config: ResolvedConfig;
  middlewares: connect.Server;
  httpServer: http.Server | null;
  pluginContainer: PluginContainer;
  moduleGraph: ModuleGraph;
  resolvedUrls: ResolvedServerUrls | null;
  listen(port?: number, isRestart?: boolean): Promise<ViteDevServer>;
  openBrowser(): void;
  printUrls(): void;
  transformIndexHtml(html: string): string;
}

export interface ResolvedServerUrls {
  local: string[];
  network: string[];
}

export async function createServer(inlineConfig: InlineConfig = {}) {
  const config = await resolveConfig(inlineConfig, "serve");
  const resolvedWatchOptions = {
    ignored: ["**/.git/**", "**/node_modules/**"],
    ignoreInitial: true,
    ignorePermissionErrors: true,
    disableGlobbing: true,
  };
  const middlewares = connect();
  const { createServer } = await import("node:http");
  const httpServer = createServer(middlewares);
  const ws = createWebSocketServer(httpServer, config);
  const moduleGraph: ModuleGraph = new ModuleGraph(url =>
    container.resolveId(url, undefined)
  );

  const watcher = chokidar.watch(
    // config file dependencies and env file might be outside of root
    [config.root],
    resolvedWatchOptions
  );
  const container = await createPluginContainer(config);

  const server: ViteDevServer = {
    config,
    middlewares,
    httpServer,
    pluginContainer: container,
    ws,
    moduleGraph,
    resolvedUrls: null,
    transformIndexHtml: null!,
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
  server.transformIndexHtml = createDevHtmlTransformFn();

  for (const hook of config.plugins) {
    if (!hook.configureServer) continue;
    await hook.configureServer(server);
  }

  const onHMRUpdate = async (file: string) => {
    try {
      await handleHMRUpdate(file, server);
    } catch (err) {
      ws.send({ type: "error", err });
    }
  };

  watcher.on("change", async file => {
    file = normalizePath(file);
    moduleGraph.onFileChange(file);
    await onHMRUpdate(file);
  });

  middlewares.use(transformMiddleware(server));
  middlewares.use(serveStaticMiddleware(config.root, server));
  // html fallback
  if (true) {
    //单页面应用
    middlewares.use(htmlFallbackMiddleware(config.root, true));
  }
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
