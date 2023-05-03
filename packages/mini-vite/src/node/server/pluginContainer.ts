import { ResolvedConfig } from "../config";
import { join } from "node:path";
import type { CustomPluginOptions, PartialResolvedId } from "rollup";

export interface PluginContainer {
  buildStart(): Promise<void>;
  resolveId(
    id: string,
    importer?: string,
    options?: {
      assertions?: Record<string, string>;
      custom?: CustomPluginOptions;
      skip?: Set<Plugin>;
      ssr?: boolean;
      /**
       * @internal
       */
      scan?: boolean;
      isEntry?: boolean;
    }
  ): Promise<PartialResolvedId | null>;
}
export async function createPluginContainer(
  config: ResolvedConfig
): Promise<PluginContainer> {
  const container: PluginContainer = {
    async buildStart() {
      // await hookParallel("buildStart");
    },
    async resolveId(rawId, importer = join(config.root, "index.html")) {
      let id: string | null = null;
      // const partial: Partial<PartialResolvedId> = {};
      for (const plugin of config.plugins) {
        if (!plugin.resolveId) continue;
        const result = await plugin.resolveId(rawId, importer);
        if (!result) continue;

        if (typeof result === "string") {
          id = result;
        } else {
          id = result.id;
          // Object.assign(partial, result);
        }
        break;
      }
      return { id } as PartialResolvedId | null;
    },
  };
  return container;
}
