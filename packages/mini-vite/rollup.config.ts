import { defineConfig } from "rollup";
import type { RollupOptions } from "rollup";
import path from "node:path"; // 加快访问速度
import { readFileSync } from "node:fs";
import typescript from "@rollup/plugin-typescript";
import { fileURLToPath } from "node:url";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url)).toString()
);
const __dirname = fileURLToPath(new URL(".", import.meta.url));

function createNodeConfig(isProduction: boolean) {
  return defineConfig({
    output: {
      dir: "./dist",
      entryFileNames: `node/[name].js`,
      chunkFileNames: "node/chunks/dep-[hash].js",
      exports: "named",
      format: "esm",
      externalLiveBindings: false,
      freeze: false,
      sourcemap: true,
    },
    external: [
      "fsevents",
      ...Object.keys(pkg.dependencies),
      ...(isProduction ? [] : Object.keys(pkg.devDependencies)),
    ],
    input: {
      index: path.resolve(__dirname, "src/node/index.ts"),
      cli: path.resolve(__dirname, "src/node/cli.ts"),
      constants: path.resolve(__dirname, "src/node/constants.ts"),
    },
    plugins: [
      typescript({
        tsconfig: path.resolve(__dirname, "src/node/tsconfig.json"),
        declaration: true,
        declarationDir: "./dist/node",
      }),
    ],
  });
}

export default (commandLineArgs: any): RollupOptions[] => {
  const isProduction = !commandLineArgs.watch;
  return defineConfig([createNodeConfig(isProduction)]);
};
