import type {
  // Plugin as RollupPlugin,
  ResolveIdResult,
  LoadResult,
  TransformResult,
} from "rollup";
import { ViteDevServer } from "./server";
export interface Plugin {
  name: string;
  enforce?: "pre" | "post";
  buildStart?: () => void;
  resolveId?: (
    source: string,
    importer: string | undefined,
    options?: {
      scan?: boolean;
    }
  ) => Promise<ResolveIdResult> | ResolveIdResult;
  load?: (id: string) => Promise<LoadResult> | LoadResult;
  transform?: (
    code: string,
    id: string
  ) => Promise<TransformResult> | TransformResult;
  configureServer?: (
    this: void,
    server: ViteDevServer
  ) => (() => void) | void | Promise<(() => void) | void>;
}
