import fs from "node:fs";
import { ResolvedConfig } from "../config";
import glob from "fast-glob";
import {
  PluginContainer,
  createPluginContainer,
} from "../server/pluginContainer";
import esbuild, { Plugin } from "esbuild";
import path from "node:path";
import { normalizePath } from "../util";

const htmlTypesRE = /\.(html|vue)$/;
const scriptModuleRE =
  /(<script\b[^>]+type\s*=\s*(?:"module"|'module')[^>]*>)(.*?)<\/script>/gis; // 全局匹配 不区分大小写 允许.匹配换行符
const srcRE = /\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s'">]+))/i;
const typeRE = /\btype\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s'">]+))/i;

export async function scanImports(config: ResolvedConfig): Promise<{
  deps: Record<string, string>;
  missing: Record<string, string>;
}> {
  const deps: Record<string, string> = {};
  const missing: Record<string, string> = {};
  const esbuildContext = glob("**/*.html", {
    cwd: config.root,
    ignore: ["**/node_modules/**", `**/${config.build.outDir}/**`],
    absolute: true,
    suppressErrors: true, // suppress EACCES errors
  }).then(entries => {
    // entries = entries.filter(entry => isScannable(entry) && fs.existsSync(entry));
    return prepareEsbuildScanner(config, entries, deps, missing);
  });

  const result = esbuildContext.then(context => {
    return context.rebuild().then(() => ({
      deps,
      missing,
    }));
  });

  return result;
}

async function prepareEsbuildScanner(
  config: ResolvedConfig,
  entries: string[],
  deps: Record<string, string>,
  missing: Record<string, string>
) {
  const container = await createPluginContainer(config);
  const plugin = esbuildScanPlugin(config, container, deps, missing);

  return esbuild.context({
    absWorkingDir: process.cwd(),
    write: false,
    stdin: {
      contents: entries.map(e => `import ${JSON.stringify(e)}`).join("\n"),
      loader: "js",
    },
    bundle: true,
    logLevel: "silent",
    format: "esm",
    plugins: [plugin],
  });
}

function esbuildScanPlugin(
  config: ResolvedConfig,
  container: PluginContainer,
  depImports: Record<string, string>,
  missing: Record<string, string>
): Plugin {
  const resolve = async (
    id: string,
    importer?: string,
    options?: Parameters<PluginContainer["resolveId"]>[2] // 第三个参数的类型
  ) => {
    const resolved = await container.resolveId(
      id,
      importer && normalizePath(importer),
      {
        ...options,
        scan: true,
      }
    );
    return resolved?.id;
  };
  return {
    name: "vite:dep-scan",
    setup(build) {
      build.onResolve({ filter: htmlTypesRE }, async ({ path, importer }) => {
        const resolved = await resolve(path, importer);
        if (!resolved) return;
        return {
          path: resolved,
          namespace: "html",
        };
      });
      build.onLoad(
        { filter: htmlTypesRE, namespace: "html" },
        async ({ path: _path }) => {
          let raw = fs.readFileSync(_path, "utf-8");
          let js = "";
          let match: RegExpExecArray | null;
          const regex = scriptModuleRE;

          while ((match = regex.exec(raw))) {
            const typeMatch = match[1].match(typeRE);
            const type =
              typeMatch && (typeMatch[1] || typeMatch[2] || typeMatch[3]);
            if (type && type !== "module") continue;

            const srcMatch = match[1].match(srcRE);
            if (srcMatch) {
              const src = srcMatch[1] || srcMatch[2] || srcMatch[3];
              js += `import ${JSON.stringify(src)}\n`;
            }
          }

          return {
            loader: "js",
            contents: js,
          };
        }
      );
      build.onResolve(
        { filter: /^[\w@][^:]/ },
        async ({ path: id, importer }) => {
          const resolved = await resolve(id, importer);
          if (resolved) {
            if (resolved.includes("node_modules")) {
              depImports[id] = resolved;
              return {
                path: id,
                external: true,
              };
            } else {
              const namespace = /\\.(html|vue)$/.test(resolved)
                ? "html"
                : undefined;
              return {
                path: path.resolve(resolved),
                namespace,
              };
            }
          } else {
            missing[id] = normalizePath(importer);
          }
        }
      );

      build.onResolve({ filter: /.*/ }, async ({ path: id, importer }) => {
        const resolved = await resolve(id, importer);
        if (resolved)
          return {
            path: path.resolve(resolved),
            namespace: htmlTypesRE.test(resolved) ? "html" : undefined,
          };
      });
    },
  };
}
