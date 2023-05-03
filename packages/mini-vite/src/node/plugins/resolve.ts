import path from "node:path";
import { Plugin } from "../plugin";
import type { PartialResolvedId } from "rollup";
import fs from "node:fs";
import { bareImportRE, isObject, normalizePath } from "../util";
import { PackageData, loadPackageData, resolvePackageData } from "../packages";

export function resolvePlugin(root: string): Plugin {
  return {
    name: "vite:resolve",
    async resolveId(id, importer) {
      let res: string | PartialResolvedId | undefined;
      // URL
      // /foo -> /fs-root/foo
      if (id.startsWith("/")) {
        const fsPath = path.resolve(root, id.slice(1));
        if ((res = tryFsResolve(fsPath))) return res;
      }

      // relative
      if (id.startsWith(".")) {
        const basedir = importer ? path.dirname(importer) : process.cwd();
        const fsPath = path.resolve(basedir, id);

        if ((res = tryFsResolve(fsPath))) return res;
      }

      // absolute fs path
      if (/^[A-Za-z]:[/\\]/.test(id) && (res = tryFsResolve(id))) return res;

      // bare module
      if (bareImportRE.test(id)) {
        if ((res = tryNodeResolve(id, importer, root))) return res;
      }
    },
  };
}

function tryFsResolve(fsPath: string): string | undefined {
  let res: string | undefined;
  if ((res = tryResolveFile(fsPath))) return res;
}

function tryResolveFile(file: string): string | undefined {
  let stat: fs.Stats | undefined;
  try {
    stat = fs.statSync(file, { throwIfNoEntry: false });
  } catch {
    return;
  }

  if (stat) {
    if (!stat.isDirectory()) {
      return getRealPath(file);
    } else {
      const pkgPath = file + "/package.json";
      try {
        const pkg = loadPackageData(pkgPath);
        const resolved = resolvePackageEntry(file, pkg);
        return resolved;
      } catch (e) {
        if (e.code !== "ENOENT") {
          throw e;
        }
      }
    }
  }
}

export function tryNodeResolve(
  id: string,
  importer: string | null | undefined,
  root: string
): PartialResolvedId {
  let basedir: string;
  if (importer && fs.existsSync(importer)) {
    basedir = path.dirname(importer);
  } else {
    basedir = root;
  }

  const rootPkg = resolvePackageData(id, basedir);

  let resolved: string | undefined;
  try {
    resolved = resolvePackageEntry(id, rootPkg!);
  } catch (e) {
    throw e;
  }
  return { id: resolved! };
}

function getRealPath(resolved: string): string {
  return normalizePath(fs.realpathSync(resolved));
}

/**
 * 解析入口文件
 */
export function resolvePackageEntry(id: string, { dir, data }: PackageData) {
  try {
    // 默认寻找exports['.'].import.default 下的路径为入口路径
    let entryPoint: string | undefined = (data?.exports as Record<string, any>)[
      "."
    ]?.import?.default;

    // 如果没有默认路径或者默认路径是.mjs文件, 寻找browser/module字段下的路径
    if (!entryPoint || entryPoint.endsWith(".mjs")) {
      const browserEntry =
        typeof data.browser === "string"
          ? data.browser
          : isObject(data.browser) && data.browser["."];
      if (browserEntry) {
        entryPoint = browserEntry;
      } else {
        entryPoint = data.module;
      }
    }
    entryPoint = entryPoint || data.main || "index.js";

    // 这里应该处理browser字段，略过
    /* e.g. "browser": {
      "./lib/index.js": "./lib/index.browser.js", // browser+cjs
      "./lib/index.mjs": "./lib/index.browser.mjs"  // browser+mjs
    }, */
    const resolvedEntryPoint = tryFsResolve(path.join(dir, entryPoint));
    return resolvedEntryPoint;
  } catch (e) {
    throw new Error(
      `Failed to resolve entry for package "${id}". ` +
        `The package may have incorrect main/module/exports specified in its package.json` +
        (e.message ? ": " + e.message : ".")
    );
  }
}
