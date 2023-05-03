import type {
  Plugin as RollupPlugin,
  ResolveIdResult,
  CustomPluginOptions,
} from "rollup";
export interface Plugin extends RollupPlugin {
  enforce?: "pre" | "post";
  resolveId?: (
    source: string,
    importer: string | undefined,
    options?: {
      assertions: Record<string, string>;
      custom?: CustomPluginOptions;
      ssr?: boolean;
      /**
       * @internal
       */
      scan?: boolean;
      isEntry: boolean;
    }
  ) => Promise<ResolveIdResult> | ResolveIdResult;
}
