import path from "node:path";
import type { AddressInfo, Server } from "node:net";
import { CommonServerOptions } from "./http";
import { ResolvedConfig } from "./config";
import { ResolvedServerUrls } from "./server";

export function mergeConfig(
  defaults: Record<string, any>,
  overrides: Record<string, any>
) {
  const merged = { ...defaults };
  for (const key in overrides) {
    const value = overrides[key];
    if (value == null) {
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

export function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function normalizePath(id: string): string {
  return path.posix.normalize(id.replace(/\\/g, "/"));
}

export async function resolveServerUrls(
  server: Server,
  options: CommonServerOptions,
  config: ResolvedConfig
): Promise<ResolvedServerUrls> {
  const address = server.address();

  // const isAddressInfo = (x: any): x is AddressInfo => x?.address;
  // if (!isAddressInfo(address)) {
  //   return { local: [], network: [] };
  // }

  const local: string[] = [];
  const network: string[] = [];
  let hostname = options.host === true ? undefined : "localhost";
  const protocol = options.https ? "https" : "http";
  const port = (address as AddressInfo).port;
  // ipv6 host
  if (hostname?.includes(":")) {
    hostname = `[${hostname}]`;
  }
  local.push(`${protocol}://${hostname}:${port}`);

  return { local, network };
}

export const queryRE = /\?.*$/s;
export const hashRE = /#.*$/s;
export const cleanUrl = (url: string): string =>
  url.replace(hashRE, "").replace(queryRE, "");
