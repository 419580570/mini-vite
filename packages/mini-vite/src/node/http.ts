import type {
  // Server as HttpServer,
  ServerOptions as HttpsServerOptions,
} from "node:https";
import type { OutgoingHttpHeaders as HttpServerHeaders } from "node:http";
export interface CommonServerOptions {
  port?: number;
  strictPort?: boolean;
  host?: string | boolean;
  https?: boolean | HttpsServerOptions;
  open?: boolean | string;
  proxy?: any;
  cors?: any;
  headers?: HttpServerHeaders;
}

export async function httpServerStart(
  httpServer: any,
  serverOptions: {
    port: number;
    host: string | undefined;
  }
): Promise<number> {
  let { port, host } = serverOptions;

  return new Promise((resolve, reject) => {
    const onError = (e: Error & { code?: string }) => {
      if (e.code === "EADDRINUSE") {
        httpServer.removeListener("error", onError);
        reject(new Error(`Port ${port} is already in use`));
      } else {
        httpServer.removeListener("error", onError);
        reject(e);
      }
    };

    httpServer.on("error", onError);

    httpServer.listen(port, host, () => {
      httpServer.removeListener("error", onError);
      resolve(port);
    });
  });
}
