import path from "node:path";
import fs from "node:fs";
import type { AddressInfo, Server } from "node:net";
import { CommonServerOptions } from "./http";
import { ResolvedConfig } from "./config";
import { ResolvedServerUrls } from "./server";
import { createHash } from "node:crypto";
import resolve from "resolve";

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

export const bareImportRE = /^[\w@](?!.*:\/\/)/;
export const queryRE = /\?.*$/s;
export const hashRE = /#.*$/s;
export const cleanUrl = (url: string): string =>
  url.replace(hashRE, "").replace(queryRE, "");
const knownJsSrcRE = /\.(?:[jt]sx?|m[jt]s|vue|marko|svelte|astro|imba)(?:$|\?)/;

export const isJSRequest = (url: string): boolean => {
  url = cleanUrl(url);
  if (knownJsSrcRE.test(url)) {
    return true;
  }
  if (!path.extname(url) && !url.endsWith("/")) {
    return true;
  }
  return false;
};

export function resolveFrom(id: string, basedir: string): string {
  return resolve.sync(id, {
    basedir,
    paths: [],
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
    // necessary to work with pnpm
    preserveSymlinks: false,
  });
}

export const flattenId = (id: string): string =>
  id
    .replace(/[/:]/g, "_")
    .replace(/\./g, "__")
    .replace(/(\s*>\s*)/g, "___");

export function getHash(text: Buffer | string): string {
  return createHash("sha256").update(text).digest("hex").substring(0, 8);
}

export function emptyDir(dir: string): void {
  for (const file of fs.readdirSync(dir)) {
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

export function writeFile(
  filename: string,
  content: string | Uint8Array
): void {
  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filename, content);
}

export function wrapId(id: string): string {
  return id.startsWith(`/@id/`) ? id : `/@id/` + id.replace("\0", `__x00__`);
}

/**
 * Undo {@link wrapId}'s `/@id/` and null byte replacements.
 */
export function unwrapId(id: string): string {
  return id.startsWith(`/@id/`)
    ? id.slice(`/@id/`.length).replace(`__x00__`, "\0")
    : id;
}
