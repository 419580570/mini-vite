import { WebSocketServer as WebSocketServerRaw } from "ws";
import type { Server } from "node:http";
import { ResolvedConfig } from "../config";
import { HMRPayload } from "../../client/hmrPayload";

export interface WebSocketServer {
  send(payload: HMRPayload): void;
}

export function createWebSocketServer(
  server: Server | null,
  config: ResolvedConfig
) {
  const hmr = config.server.hmr;
  const port = (hmr && hmr.port) || 24678;
  const host = (hmr && hmr.host) || undefined;
  let wss = new WebSocketServerRaw({ port, host });

  wss.on("connection", socket => {
    socket.on("mesage", raw => {
      let parsed: any;
      try {
        parsed = JSON.parse(String(raw));
      } catch {}
    });
    socket.send(JSON.stringify({ type: "connected" }));
  });

  return {
    send(payload: HMRPayload) {
      const stringified = JSON.stringify(payload);
      wss.clients.forEach(client => {
        // readyState 1 means the connection is open
        if (client.readyState === 1) {
          client.send(stringified);
        }
      });
    },
  };
}
