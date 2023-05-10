import { ViteDevServer } from ".";
import type { SourceMap } from "rollup";
import { promises as fs } from "node:fs";
import { cleanUrl, isObject } from "../util";

export interface TransformResult {
  code: string;
  map: SourceMap | null;
  etag?: string;
  deps?: string[];
  dynamicDeps?: string[];
}

export function transformRequest(url: string, server: ViteDevServer) {
  // : Promise<TransformResult | null>
  return doTransform(url, server);
}

async function doTransform(url: string, server: ViteDevServer) {
  const { pluginContainer } = server;
  const module = await server.moduleGraph.getModuleByUrl(url);

  const cached = module?.transformResult;
  if (cached) return cached;

  const id = (await pluginContainer.resolveId(url, undefined))?.id || url;

  const result = loadAndTransform(id, url, server);
  return result;
}

async function loadAndTransform(
  id: string,
  url: string,
  server: ViteDevServer
) {
  const { pluginContainer, moduleGraph } = server;
  let code: string | null = null;
  const loadResult = await pluginContainer.load(id);

  if (loadResult == null) {
    try {
      code = await fs.readFile(cleanUrl(id), "utf-8");
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw e;
      }
    }
  } else {
    if (isObject(loadResult)) {
      code = loadResult.code;
    } else {
      code = loadResult;
    }
  }
  const mod = await moduleGraph.ensureEntryFromUrl(url);

  const transformResult = await pluginContainer.transform(code!, id);
  mod.transformResult = transformResult;
  return transformResult;
}
