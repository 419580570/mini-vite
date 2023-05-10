import path from "path";
import {
  DepsOptimizer,
  // DepOptimizationMetadata,
  OptimizedDepInfo,
  addOptimizedDepInfo,
  discoverProjectDependencies,
  initDepsOptimizerMetadata,
  loadCachedDepOptimizationMetadata,
  runOptimizeDeps,
} from ".";
import { ResolvedConfig } from "../config";
import { ViteDevServer } from "../server";
import { flattenId, normalizePath } from "../util";

const depsOptimizerMap = new WeakMap<ResolvedConfig, DepsOptimizer>();

export function getDepsOptimizer(
  config: ResolvedConfig,
  ssr?: boolean
): DepsOptimizer | undefined {
  return depsOptimizerMap.get(config);
}

export async function initDepsOptimizer(
  config: ResolvedConfig,
  server: ViteDevServer
): Promise<void> {
  createDepsOptimizer(config, server);
}

async function createDepsOptimizer(
  config: ResolvedConfig,
  server: ViteDevServer
) {
  const isBuild = config.command === "build";
  let discover;
  /* 暂时直接读取缓存，未做决定是否需要重新运行预构建 */
  const cachedMetadata = loadCachedDepOptimizationMetadata(config);
  let metadata = cachedMetadata || initDepsOptimizerMetadata();

  const depsOptimizer = {
    metadata,
  };

  depsOptimizerMap.set(config, depsOptimizer);
  if (!cachedMetadata) {
    if (!isBuild) {
      // 保证在服务启动后运行
      setTimeout(async () => {
        try {
          discover = discoverProjectDependencies(config);
          const deps = await discover.result;
          discover = undefined;

          for (const id of Object.keys(deps)) {
            if (!metadata.discovered[id]) {
              addMissingDep(id, deps[id]);
            }
          }
          const knownDeps = prepareKnownDeps();
          runOptimizeDeps(config, knownDeps);
        } catch (e) {
          console.log(e.stack || e.message);
        }
      }, 0);
    }
  }

  function addMissingDep(id: string, resolved: string) {
    return addOptimizedDepInfo(metadata, "discovered", {
      id,
      file: normalizePath(
        path.resolve(
          normalizePath(path.resolve(config.cacheDir, "deps")),
          flattenId(id) + ".js"
        )
      ),
      src: resolved,
    });
  }

  function prepareKnownDeps() {
    const knownDeps: Record<string, OptimizedDepInfo> = {};
    // Clone optimized info objects, fileHash, browserHash may be changed for them
    for (const dep of Object.keys(metadata.optimized)) {
      knownDeps[dep] = { ...metadata.optimized[dep] };
    }
    for (const dep of Object.keys(metadata.discovered)) {
      // Clone the discovered info discarding its processing promise
      const { processing, ...info } = metadata.discovered[dep];
      knownDeps[dep] = info;
    }
    return knownDeps;
  }
}
