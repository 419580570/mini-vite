import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const DEFAULT_CONFIG_FILES = [
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.ts",
  "vite.config.cjs",
  "vite.config.mts",
  "vite.config.cts",
];
export const DEFAULT_DEV_PORT = 5173;
export const CSS_LANGS_RE =
  /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/;
export const FS_PREFIX = `/@fs/`;
export const CLIENT_PUBLIC_PATH = `/@vite/client`;
export const VITE_PACKAGE_DIR = resolve(
  // import.meta.url is `dist/node/constants.js` after bundle
  fileURLToPath(import.meta.url),
  "../../.."
);

export const CLIENT_ENTRY = resolve(VITE_PACKAGE_DIR, "dist/client/client.mjs");
