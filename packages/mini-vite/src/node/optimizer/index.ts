import path from "path";
import fs from "node:fs";
import { ResolvedConfig } from "../config";
import { scanImports } from "./scan";
import { emptyDir, flattenId, normalizePath, writeFile } from "../util";
import esbuild from "esbuild";

export interface DepsOptimizer {
  metadata: DepOptimizationMetadata;
}

export interface OptimizedDepInfo {
  id: string;
  file: string;
  src?: string;
  needsInterop?: boolean;
  browserHash?: string;
  fileHash?: string;
  processing?: Promise<void>;
  exportsData?: Promise<{}>;
}

export interface DepOptimizationMetadata {
  // hash: string;
  // browserHash: string;
  optimized: Record<string, OptimizedDepInfo>;
  // chunks: Record<string, OptimizedDepInfo>;
  discovered: Record<string, OptimizedDepInfo>;
  // depInfoList: OptimizedDepInfo[];
}

export function discoverProjectDependencies(config: ResolvedConfig) {
  const result = scanImports(config);

  return {
    result: result.then(({ deps, missing }) => {
      if (Object.keys(missing).length) {
        throw new Error(
          `The following dependencies are imported but could not be resolved:`
        );
      }

      return deps;
    }),
  };
}

export function runOptimizeDeps(
  resolvedConfig: ResolvedConfig,
  depsInfo: Record<string, OptimizedDepInfo>
): Promise<DepOptimizationMetadata> {
  const processingCacheDir = path.resolve(resolvedConfig.cacheDir, "deps");

  if (fs.existsSync(processingCacheDir)) {
    emptyDir(processingCacheDir);
  } else {
    fs.mkdirSync(processingCacheDir, { recursive: true });
  }
  writeFile(
    path.resolve(processingCacheDir, "package.json"),
    JSON.stringify({ type: "module" })
  );

  const metadata = initDepsOptimizerMetadata();
  const preparedRun = prepareEsbuildOptimizerRun(
    resolvedConfig,
    depsInfo,
    processingCacheDir
  );

  const result = preparedRun.then(({ context }) => {
    return context
      .rebuild()
      .then(() => {
        // const meta = result.metafile!;

        for (const id in depsInfo) {
          const { ...info } = depsInfo[id];
          addOptimizedDepInfo(metadata, "optimized", {
            ...info,
          });
        }
        writeFile(
          path.join(processingCacheDir, "_metadata.json"),
          stringifyDepsOptimizerMetadata(
            metadata,
            normalizePath(path.resolve(resolvedConfig.cacheDir, "deps"))
          )
        );
        return metadata;
      })
      .catch(e => {
        throw e;
      });
  });

  return result;
}

export function loadCachedDepOptimizationMetadata(
  config: ResolvedConfig
): DepOptimizationMetadata | undefined {
  let cachedMetadata: DepOptimizationMetadata | undefined;
  const depsCacheDir = normalizePath(path.resolve(config.cacheDir, "deps"));
  try {
    const cachedMetadataPath = path.join(depsCacheDir, "_metadata.json");
    cachedMetadata = parseDepsOptimizerMetadata(
      fs.readFileSync(cachedMetadataPath, "utf-8"),
      depsCacheDir
    );
  } catch (e) {}
  if (cachedMetadata) return cachedMetadata;

  fs.rmSync(depsCacheDir, { recursive: true, force: true });
}

function parseDepsOptimizerMetadata(
  jsonMetadata: string,
  depsCacheDir: string
): DepOptimizationMetadata | undefined {
  const { optimized } = JSON.parse(
    jsonMetadata,
    (key: string, value: string) => {
      // Paths can be absolute or relative to the deps cache dir where
      // the _metadata.json is located
      if (key === "file" || key === "src") {
        return normalizePath(path.resolve(depsCacheDir, value));
      }
      return value;
    }
  );
  const metadata = {
    optimized: {},
    discovered: {},
    // depInfoList: [],
  };
  for (const id of Object.keys(optimized)) {
    addOptimizedDepInfo(metadata, "optimized", {
      ...optimized[id],
      id,
    });
  }
  return metadata;
}

export function initDepsOptimizerMetadata(): DepOptimizationMetadata {
  return {
    optimized: {},
    discovered: {},
    // depInfoList: [],
  };
}

export function addOptimizedDepInfo(
  metadata: DepOptimizationMetadata,
  type: "optimized" | "discovered",
  depInfo: OptimizedDepInfo
): OptimizedDepInfo {
  metadata[type][depInfo.id] = depInfo;
  // metadata.depInfoList.push(depInfo)
  return depInfo;
}

async function prepareEsbuildOptimizerRun(
  resolvedConfig: ResolvedConfig,
  depsInfo: Record<string, OptimizedDepInfo>,
  processingCacheDir: string
) {
  const flatIdDeps: Record<string, string> = {};
  for (const id in depsInfo) {
    const src = depsInfo[id].src!;
    const flatId = flattenId(id);
    flatIdDeps[flatId] = src;
  }

  const context = await esbuild.context({
    absWorkingDir: process.cwd(),
    entryPoints: Object.keys(flatIdDeps),
    bundle: true,
    format: "esm",
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV || resolvedConfig.mode
      ),
    },
    target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
    splitting: true,
    sourcemap: true,
    outdir: processingCacheDir,
    metafile: true,
    charset: "utf8",
  });
  return { context };
}

function stringifyDepsOptimizerMetadata(
  metadata: DepOptimizationMetadata,
  depsCacheDir: string
) {
  return JSON.stringify(
    {
      optimized: Object.fromEntries(
        Object.values(metadata.optimized).map(({ id, src, file }) => [
          id,
          {
            src,
            file,
          },
        ])
      ),
    },
    (key: string, value: string) => {
      if (key === "file" || key === "src") {
        return normalizePath(path.relative(depsCacheDir, value));
      }
      return value;
    }
  );
}
export function getDepsCacheDirPrefix(config: ResolvedConfig): string {
  return normalizePath(path.resolve(config.cacheDir, "deps"));
}
