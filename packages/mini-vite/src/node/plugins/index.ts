import { ResolvedConfig } from "../config";
import { Plugin } from "../plugin";
import { resolvePlugin } from "./resolve";

export async function resolvePlugins(
  config: ResolvedConfig,
  prePlugins: Plugin[] = [],
  normalPlugins: Plugin[] = [],
  postPlugins: Plugin[] = []
) {
  return [
    ...prePlugins,
    ...normalPlugins,
    ...postPlugins,
    resolvePlugin(config.root),
  ];
}
