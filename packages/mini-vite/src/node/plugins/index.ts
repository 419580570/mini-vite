import { ResolvedConfig } from "../config";
import { Plugin } from "../plugin";
import { importAnalysisPlugin } from "./importAnalysis";
import { resolvePlugin } from "./resolve";
import { aliasPlugin } from "./alias";

export async function resolvePlugins(
  config: ResolvedConfig,
  prePlugins: Plugin[] = [],
  normalPlugins: Plugin[] = [],
  postPlugins: Plugin[] = []
) {
  return [
    aliasPlugin({ entries: config.resolve.alias }),
    ...prePlugins,
    ...normalPlugins,
    ...postPlugins,
    resolvePlugin(config),
    importAnalysisPlugin(config),
  ];
}
