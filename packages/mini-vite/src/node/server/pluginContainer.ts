import { ResolvedConfig } from "../config";
import { join } from "node:path";
import type { LoadResult, PartialResolvedId } from "rollup";
import { isObject } from "../util";

export interface PluginContainer {
  buildStart(): Promise<void>;
  resolveId(
    id: string,
    importer?: string,
    options?: { scan?: boolean }
  ): Promise<PartialResolvedId | null>;
  load(id: string): Promise<LoadResult | null>;
  transform(code: string, id: string): Promise<string>;
}
export async function createPluginContainer(
  config: ResolvedConfig
): Promise<PluginContainer> {
  const container: PluginContainer = {
    async buildStart() {
      for (const plugin of config.plugins) {
        if (!plugin.buildStart) continue;
        await plugin.buildStart();
      }
    },
    async resolveId(
      rawId,
      importer = join(config.root, "index.html"),
      options
    ) {
      let id: string | null = null;
      for (const plugin of config.plugins) {
        if (!plugin.resolveId) continue;
        const result = await plugin.resolveId(rawId, importer, {
          scan: !!options?.scan,
        });
        if (!result) continue;

        if (typeof result === "string") {
          id = result;
        } else {
          id = result.id;
        }
        break;
      }
      return { id } as PartialResolvedId | null;
    },
    async load(id) {
      for (const plugin of config.plugins) {
        if (!plugin.load) continue;
        const result = await plugin.load(id);
        if (!result) continue;

        // if (result !== null) {
        //   id = result;
        // } else {
        //   id = result.id;
        // }
        return result;
      }
      return null;
    },
    async transform(code, id) {
      for (const plugin of config.plugins) {
        if (!plugin.transform) continue;
        const result = await plugin.transform(code, id);
        if (!result) continue;
        if (isObject(result)) {
          if (result.code !== undefined) {
            code = result.code;
          }
        } else {
          code = result;
        }
      }
      return code;
    },
  };
  return container;
}
