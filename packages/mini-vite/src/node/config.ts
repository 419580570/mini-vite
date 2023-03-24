import path from "node:path";
import fs from "node:fs";
import { build } from "esbuild";

import { DEFAULT_CONFIG_FILES } from "./constants";
import { pathToFileURL } from "node:url";
import { isObject, mergeConfig, normalizePath } from "./util";
import { ServerOptions } from "./server";

export interface UserConfig {
  root?: string;
  base?: string;
  publicDir?: string | false;
  mode?: string;
  build?: any;
  logLevel?: "error" | "warn" | "info" | "silent";
  clearScreen?: boolean;
  optimizeDeps?: {
    entries?: string | string[];
    force?: boolean;
  };
  server?: ServerOptions;
}
export type UserConfigFn = () => UserConfig | Promise<UserConfig>;
export type UserConfigExport = UserConfig | Promise<UserConfig> | UserConfigFn;

export interface InlineConfig extends UserConfig {
  configFile?: string | false;
}

export type ResolvedConfig = Readonly<
  UserConfig & {
    configFile: string | undefined;
    configFileDependencies: string[];
    inlineConfig: InlineConfig;
    command: "build" | "serve";
  }
>;

export function defineConfig(config: UserConfigExport): UserConfigExport {
  return config;
}

export async function resolveConfig(
  inlineConfig: InlineConfig,
  command: "build" | "serve",
  defaultMode = "development",
  defaultNodeEnv = "development"
): Promise<ResolvedConfig> {
  let config = inlineConfig;
  let configFileDependencies: string[] = [];
  let { configFile } = config;
  if (configFile !== false) {
    const loadResult = await loadConfigFromFile(configFile);

    if (loadResult) {
      config = mergeConfig(loadResult.config, config);
      configFile = loadResult.path;
      configFileDependencies = loadResult.dependencies;
    }
  }

  const resolved: ResolvedConfig = {
    ...config,
    configFile: configFile ? normalizePath(configFile) : undefined,
    configFileDependencies,
    inlineConfig,
    root: config.root ? path.resolve(config.root) : process.cwd(),
    command,
    mode: inlineConfig.mode || defaultMode,
  };

  return resolved;
}

/* 获取vite配置文件内容 vite.config.ts */
export async function loadConfigFromFile(
  configFile?: string,
  configRoot: string = process.cwd()
) {
  let resolvedPath: string | undefined;
  if (configFile) {
    resolvedPath = path.resolve(configFile);
  } else {
    for (const filename of DEFAULT_CONFIG_FILES) {
      const filePath = path.resolve(configRoot, filename);
      if (!fs.existsSync(filePath)) continue;

      resolvedPath = filePath;
      break;
    }
  }

  if (!resolvedPath) {
    console.log("no config file found.");
    return null;
  }

  try {
    const bundled = await bundleConfigFile(resolvedPath);
    const userConfig = await loadConfigFromBundledFile(
      resolvedPath,
      bundled.code
    );

    const config = await (typeof userConfig === "function"
      ? userConfig()
      : userConfig);
    if (!isObject(config)) {
      throw new Error(`config must export or return an object.`);
    }

    return {
      path: path.posix.normalize(resolvedPath),
      config,
      dependencies: bundled.dependencies,
    };
  } catch (e) {
    console.log("failed to load config file");
  }
}

async function bundleConfigFile(fileName: string) {
  const dirnameVarName = "__vite_injected_original_dirname";
  const filenameVarName = "__vite_injected_original_filename";
  const importMetaUrlVarName = "__vite_injected_original_import_meta_url";
  const result = await build({
    absWorkingDir: process.cwd(),
    entryPoints: [fileName],
    outfile: "out.js",
    target: ["node14.18", "node16"],
    write: false,
    format: "esm",
    sourcemap: "inline",
    define: {
      __dirname: dirnameVarName,
      __filename: filenameVarName,
      "import.meta.url": importMetaUrlVarName,
    },
  });

  const { text } = result.outputFiles[0];

  return {
    code: text,
    dependencies: result.metafile ? Object.keys(result.metafile.inputs) : [],
  };
}

async function loadConfigFromBundledFile(
  fileName: string,
  bundledCode: string
) {
  const fileBase = `${fileName}.timeStamp-${Date.now()}`;
  const fileNameTmp = `${fileBase}.mjs`;
  const fileUrl = `${pathToFileURL(fileBase)}.mjs`;
  fs.writeFileSync(fileNameTmp, bundledCode);
  // const dynamicImport = new Function("file", "return import(file)");
  try {
    const code = await import(fileUrl);
    return code.default;
  } catch (e) {
    console.log(e);
  } finally {
    try {
      // 删除
      fs.unlinkSync(fileNameTmp);
    } catch {}
  }
}
