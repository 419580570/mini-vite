import path from "node:path";
import fs from "node:fs";
import { ResolvedConfig } from "../config";
import type { Plugin } from "../plugin";
import { ViteDevServer } from "../server";
import { cleanUrl, normalizePath, unwrapId, wrapId } from "../util";
import { init, parse as parseImports } from "es-module-lexer";
import type { ImportSpecifier } from "es-module-lexer";
import MagicString from "magic-string";
import { getDepsCacheDirPrefix } from "../optimizer";
import { FS_PREFIX } from "../constants";

export function importAnalysisPlugin(config: ResolvedConfig): Plugin {
  let server: ViteDevServer;
  return {
    name: "vite:import-analysis",

    configureServer(_server) {
      server = _server;
    },
    async transform(source, importer) {
      await init;
      let s: MagicString | undefined = new MagicString(source);
      let imports!: readonly ImportSpecifier[];
      // let exports!: readonly ExportSpecifier[];
      try {
        [imports] = parseImports(source);
      } catch (e) {
        if (e.message !== "exports is not defined") {
          console.error(
            `Failed to parse source for import analysis because the content ` +
              `contains invalid JS syntax. ` +
              e.idx
          );
        }
      }

      // const str = () => s || (s = new MagicString(source));
      const normalizeUrl = async (url: string): Promise<string> => {
        let resolved = await server.pluginContainer.resolveId!(url, importer);
        if (typeof resolved === "string") resolved = { id: resolved };
        if (!resolved) {
          throw new Error(
            `Failed to resolve import "${url}" from "${path.relative(
              process.cwd(),
              importer
            )}". Does the file exist?`
          );
        }

        if (resolved.id.startsWith(config.root + "/")) {
          url = resolved.id.slice(config.root.length);
        } else if (
          resolved.id.startsWith(getDepsCacheDirPrefix(config)) ||
          fs.existsSync(cleanUrl(resolved.id))
        ) {
          url = path.posix.join(FS_PREFIX, resolved.id);
        } else {
          url = resolved.id;
        }
        /**
         * 如果解析的id不是有效的浏览器导入说明符，
         * 加上前缀使其有效，会在反馈给transform之前把它去掉
         */

        if (!url.startsWith(".") && !url.startsWith("/")) {
          url = wrapId(resolved.id);
        }

        await server.moduleGraph.ensureEntryFromUrl(unwrapId(url));
        return url;
      };

      for (let index = 0; index < imports.length; index++) {
        const {
          s: start,
          e: end,
          // ss: expStart,
          // se: expEnd,
          n: specifier,
        } = imports[index];

        // const rawUrl = source.slice(start, end);
        if (specifier) {
          const url = await normalizeUrl(specifier);

          if (url !== specifier) {
            let rewrittenUrl = JSON.stringify(url).slice(1, -1);
            s = s.overwrite(start, end, rewrittenUrl, {
              contentOnly: true,
            });
          }
        }
      }

      if (s) {
        return {
          code: s.toString(),
          map: null,
        };
      } else {
        return source;
      }
    },
  };
}
